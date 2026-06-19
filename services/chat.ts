import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  type Query,
  type QuerySnapshot,
  type DocumentData,
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { getCurrentBusinessId } from './rbac';

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderBusinessId: string;
  senderName: string;
  text: string;
  createdAt: Date;
  read: boolean;
}

export interface Conversation {
  id: string;
  participantIds: string[];
  participantNames: Record<string, string>;
  participantKey?: string;
  lastMessage?: string;
  lastMessageTime?: Date;
  lastMessageSenderId?: string;
  readBy?: Record<string, Date>;
  createdAt: Date;
  updatedAt: Date;
}

/** Stable key for a B2B pair (order-independent). */
export function buildParticipantKey(businessA: string, businessB: string): string {
  return [businessA, businessB].sort().join('__');
}

/** Business id the signed-in user is acting as in chat. */
export async function getChatBusinessId(): Promise<string> {
  if (!auth?.currentUser) throw new Error('User not authenticated');
  const businessId = await getCurrentBusinessId();
  return businessId || auth.currentUser.uid;
}

function mapReadBy(raw: unknown): Record<string, Date> | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const mapped: Record<string, Date> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const date =
      value && typeof value === 'object' && 'toDate' in value
        ? (value as { toDate: () => Date }).toDate()
        : value instanceof Date
          ? value
          : undefined;
    if (date) mapped[key] = date;
  }
  return Object.keys(mapped).length > 0 ? mapped : undefined;
}

function mapConversation(docSnap: { id: string; data: () => DocumentData }): Conversation {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    participantIds: data.participantIds || [],
    participantNames: data.participantNames || {},
    participantKey: data.participantKey,
    lastMessage: data.lastMessage || '',
    lastMessageTime: data.lastMessageTime?.toDate?.(),
    lastMessageSenderId: data.lastMessageSenderId || '',
    readBy: mapReadBy(data.readBy),
    createdAt: data.createdAt?.toDate?.() || new Date(),
    updatedAt: data.updatedAt?.toDate?.() || new Date(),
  };
}

function mapMessage(docSnap: { id: string; data: () => DocumentData }, conversationId: string): Message {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    conversationId,
    senderId: data.senderId || '',
    senderBusinessId: data.senderBusinessId || '',
    senderName: data.senderName || 'Business',
    text: data.text || '',
    createdAt: data.createdAt?.toDate?.() || new Date(),
    read: data.read === true,
  };
}

function subscribeQueryWithFallback(
  primaryQuery: Query,
  fallbackQuery: Query,
  onData: (snapshot: QuerySnapshot<DocumentData>) => void,
  label: string,
  onError?: (error: { code?: string; message?: string }) => void
): () => void {
  let unsubscribe: (() => void) | undefined;
  let active = true;

  const attach = (q: Query, isFallback: boolean) => {
    unsubscribe = onSnapshot(
      q,
      onData,
      (error: { code?: string; message?: string }) => {
        if (!active) return;
        if (!isFallback && error.code === 'failed-precondition') {
          unsubscribe?.();
          attach(fallbackQuery, true);
          return;
        }
        console.error(`Error listening to ${label}:`, error);
        onError?.(error);
      }
    );
  };

  attach(primaryQuery, false);
  return () => {
    active = false;
    unsubscribe?.();
  };
}

/** Other business in a B2B thread (never returns the viewer's own business). */
export function getOtherParticipantFromConversation(
  conversation: Conversation,
  myBusinessId: string
): { id: string; name: string } {
  const myName = (conversation.participantNames[myBusinessId] || '').trim().toLowerCase();
  const candidates = conversation.participantIds.filter((id) => id !== myBusinessId);

  if (candidates.length === 0) {
    return { id: '', name: 'Business' };
  }

  // Skip legacy duplicate entries that share the same display name as the viewer
  for (const id of candidates) {
    const name = conversation.participantNames[id] || '';
    const normalized = name.trim().toLowerCase();
    if (myName && normalized && normalized === myName) continue;
    return { id, name: name || 'Business' };
  }

  const fallbackId = candidates[0];
  return {
    id: fallbackId,
    name: conversation.participantNames[fallbackId] || 'Business',
  };
}

export function conversationHasUnread(
  conversation: Conversation,
  viewerBusinessId?: string
): boolean {
  if (!viewerBusinessId || !conversation.lastMessage) return false;
  if (
    !conversation.lastMessageSenderId ||
    conversation.lastMessageSenderId === viewerBusinessId
  ) {
    return false;
  }
  const lastRead = conversation.readBy?.[viewerBusinessId];
  const messageAt = conversation.lastMessageTime || conversation.updatedAt;
  return !lastRead || messageAt.getTime() > lastRead.getTime();
}

/** True when the message was sent by the current business. */
export function isMessageFromMyBusiness(
  message: Message,
  myBusinessId: string | null | undefined,
  conversation?: Conversation
): boolean {
  if (!myBusinessId) return false;

  if (message.senderBusinessId) {
    return message.senderBusinessId === myBusinessId;
  }

  // Legacy messages without senderBusinessId — match sender display name only
  if (conversation) {
    const myName = conversation.participantNames[myBusinessId];
    if (myName && message.senderName === myName) return true;
    return false;
  }

  return false;
}

async function userActsForBusiness(businessId: string): Promise<boolean> {
  if (!auth?.currentUser || !db) return false;
  if (businessId === auth.currentUser.uid) return true;
  const myBusinessId = await getChatBusinessId();
  return businessId === myBusinessId;
}

async function userCanAccessConversation(participantIds: string[]): Promise<boolean> {
  if (!auth?.currentUser) return false;
  for (const id of participantIds) {
    if (await userActsForBusiness(id)) return true;
  }
  return false;
}

/** Display name for the current business in chat. */
export async function getCurrentChatDisplayName(): Promise<string> {
  if (!auth?.currentUser || !db) return 'Business';

  try {
    const businessId = await getChatBusinessId();
    const businessDoc = await getDoc(doc(db, 'businesses', businessId));
    if (businessDoc.exists()) {
      const data = businessDoc.data();
      return data.businessName || data.displayName || auth.currentUser.email || 'Business';
    }
  } catch (error) {
    console.error('Error fetching chat display name:', error);
  }

  return auth.currentUser.displayName || auth.currentUser.email || 'Business';
}

async function findExistingConversation(
  myBusinessId: string,
  otherBusinessId: string
): Promise<string | null> {
  if (!db) return null;

  const participantKey = buildParticipantKey(myBusinessId, otherBusinessId);
  const conversationsRef = collection(db, 'conversations');

  // Prefer indexed lookup by stable pair key
  try {
    const byKey = query(conversationsRef, where('participantKey', '==', participantKey));
    const keySnap = await getDocs(byKey);
    if (!keySnap.empty) return keySnap.docs[0].id;
  } catch {
    // Index may not exist yet — fall through
  }

  try {
    const byParticipant = query(
      conversationsRef,
      where('participantIds', 'array-contains', myBusinessId)
    );
    const snap = await getDocs(byParticipant);

    for (const docSnap of snap.docs) {
      const participantIds: string[] = docSnap.data().participantIds || [];
      if (
        participantIds.length === 2 &&
        participantIds.includes(myBusinessId) &&
        participantIds.includes(otherBusinessId)
      ) {
        return docSnap.id;
      }
    }
  } catch (error: unknown) {
    const err = error as { code?: string };
    if (err.code !== 'permission-denied') {
      throw error;
    }
  }

  return null;
}

/**
 * Get or create a B2B conversation between the current business and another business.
 */
export const getOrCreateConversation = async (
  otherBusinessId: string,
  otherBusinessName: string
): Promise<string> => {
  if (!auth?.currentUser || !db) {
    throw new Error('User not authenticated');
  }

  const myBusinessId = await getChatBusinessId();
  if (myBusinessId === otherBusinessId) {
    throw new Error('Cannot start a conversation with your own business');
  }

  const existingId = await findExistingConversation(myBusinessId, otherBusinessId);
  if (existingId) return existingId;

  const myBusinessName = await getCurrentChatDisplayName();
  const sortedIds = [myBusinessId, otherBusinessId].sort();

  const docRef = await addDoc(collection(db, 'conversations'), {
    participantIds: sortedIds,
    participantKey: buildParticipantKey(myBusinessId, otherBusinessId),
    participantNames: {
      [myBusinessId]: myBusinessName,
      [otherBusinessId]: otherBusinessName,
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
};

/** Send a message on behalf of the current business. */
export const sendMessage = async (conversationId: string, text: string): Promise<void> => {
  if (!auth?.currentUser || !db) {
    throw new Error('User not authenticated');
  }

  const trimmed = text.trim();
  if (!trimmed) throw new Error('Message cannot be empty');

  const myBusinessId = await getChatBusinessId();
  const conversationRef = doc(db, 'conversations', conversationId);
  const conversationDoc = await getDoc(conversationRef);

  if (!conversationDoc.exists()) {
    throw new Error('Conversation not found');
  }

  const participantIds: string[] = conversationDoc.data().participantIds || [];
  if (!(await userCanAccessConversation(participantIds))) {
    throw new Error('You are not a participant in this conversation');
  }
  if (!participantIds.includes(myBusinessId)) {
    throw new Error('This conversation does not belong to your current business');
  }

  const senderName = await getCurrentChatDisplayName();

  await addDoc(collection(db, 'conversations', conversationId, 'messages'), {
    senderId: auth.currentUser.uid,
    senderBusinessId: myBusinessId,
    senderName,
    text: trimmed,
    createdAt: serverTimestamp(),
    read: false,
  });

  await updateDoc(conversationRef, {
    lastMessage: trimmed,
    lastMessageTime: serverTimestamp(),
    lastMessageSenderId: myBusinessId,
    updatedAt: serverTimestamp(),
    [`participantNames.${myBusinessId}`]: senderName,
  });
};

/** Mark incoming messages as read for the current business. */
export const markMessagesAsRead = async (conversationId: string): Promise<void> => {
  if (!auth?.currentUser || !db) return;

  const myBusinessId = await getChatBusinessId();
  const messagesRef = collection(db, 'conversations', conversationId, 'messages');
  const snap = await getDocs(messagesRef);

  const updates = snap.docs
    .filter((item) => {
      const data = item.data();
      if (data.read === true) return false;
      if (data.senderBusinessId) {
        return data.senderBusinessId !== myBusinessId;
      }
      return data.senderId !== auth!.currentUser!.uid;
    })
    .map((item) => updateDoc(item.ref, { read: true }));

  if (updates.length > 0) {
    await Promise.all(updates);
  }

  await updateDoc(doc(db, 'conversations', conversationId), {
    [`readBy.${myBusinessId}`]: serverTimestamp(),
  });
};

export const getConversations = async (myBusinessId?: string): Promise<Conversation[]> => {
  if (!auth?.currentUser || !db) return [];

  const businessId = myBusinessId || (await getChatBusinessId());
  const conversationsRef = collection(db, 'conversations');

  try {
    const q = query(
      conversationsRef,
      where('participantIds', 'array-contains', businessId),
      orderBy('updatedAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(mapConversation);
  } catch (error: unknown) {
    const err = error as { code?: string };
    if (err.code !== 'failed-precondition') throw error;

    const q = query(conversationsRef, where('participantIds', 'array-contains', businessId));
    const snap = await getDocs(q);
    const list = snap.docs.map(mapConversation);
    list.sort((a, b) => (b.updatedAt?.getTime() || 0) - (a.updatedAt?.getTime() || 0));
    return list;
  }
};

export const subscribeToConversation = (
  conversationId: string,
  callback: (conversation: Conversation | null) => void
): (() => void) => {
  if (!db) return () => {};

  return onSnapshot(
    doc(db, 'conversations', conversationId),
    (snap) => callback(snap.exists() ? mapConversation(snap) : null),
    (error) => console.error('Error listening to conversation:', error)
  );
};

export const subscribeToMessages = (
  conversationId: string,
  callback: (messages: Message[]) => void,
  onError?: () => void
): (() => void) => {
  if (!db) {
    onError?.();
    return () => {};
  }

  const messagesRef = collection(db, 'conversations', conversationId, 'messages');
  return subscribeQueryWithFallback(
    query(messagesRef, orderBy('createdAt', 'asc')),
    messagesRef,
    (snapshot) => {
      const messages = snapshot.docs.map((item) => mapMessage(item, conversationId));
      messages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      callback(messages);
    },
    'messages',
    onError
  );
};

/** Real-time inbox for a specific business (re-subscribe when business context changes). */
export const subscribeToConversations = (
  callback: (conversations: Conversation[]) => void,
  businessId: string,
  onError?: (error: { code?: string; message?: string }) => void
): (() => void) => {
  if (!auth?.currentUser || !db || !businessId) {
    onError?.({ code: 'unauthenticated', message: 'Not signed in' });
    return () => {};
  }

  const conversationsRef = collection(db, 'conversations');
  return subscribeQueryWithFallback(
    query(
      conversationsRef,
      where('participantIds', 'array-contains', businessId),
      orderBy('updatedAt', 'desc')
    ),
    query(conversationsRef, where('participantIds', 'array-contains', businessId)),
    (snapshot) => {
      const list = snapshot.docs.map(mapConversation);
      list.sort((a, b) => (b.updatedAt?.getTime() || 0) - (a.updatedAt?.getTime() || 0));
      callback(list);
    },
    'conversations',
    onError
  );
};

export const deleteConversation = async (conversationId: string): Promise<void> => {
  if (!auth?.currentUser || !db) {
    throw new Error('User not authenticated');
  }

  const conversationRef = doc(db, 'conversations', conversationId);
  const conversationDoc = await getDoc(conversationRef);

  if (!conversationDoc.exists()) {
    throw new Error('Conversation not found');
  }

  const participantIds: string[] = conversationDoc.data().participantIds || [];
  if (!(await userCanAccessConversation(participantIds))) {
    throw new Error('You are not a participant in this conversation');
  }

  const messagesRef = collection(db, 'conversations', conversationId, 'messages');
  const messagesSnap = await getDocs(messagesRef);
  await Promise.all(messagesSnap.docs.map((item) => deleteDoc(item.ref)));
  await deleteDoc(conversationRef);
};

export const getBusinessName = async (businessId: string): Promise<string> => {
  if (!db) return 'Business';

  try {
    const businessDoc = await getDoc(doc(db, 'businesses', businessId));
    if (businessDoc.exists()) {
      const data = businessDoc.data();
      return data.businessName || data.displayName || 'Business';
    }
  } catch (error) {
    console.error('Error fetching business name:', error);
  }

  return 'Business';
};
