import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  RefreshControl,
  Alert,
} from 'react-native';
import {
  Text,
  TextInput,
  Card,
  Avatar,
  ActivityIndicator,
  IconButton,
  Button,
} from 'react-native-paper';
import { Swipeable } from 'react-native-gesture-handler';
import Header from '../../components/Header';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { getColors } from '../../theme/colors';
import { useDrawer } from '../../contexts/DrawerContext';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { auth } from '../../config/firebase';
import { useBusinessContext } from '../../contexts/BusinessContext';
import {
  getOrCreateConversation,
  getConversations,
  sendMessage,
  subscribeToMessages,
  subscribeToConversations,
  subscribeToConversation,
  getBusinessName,
  deleteConversation,
  markMessagesAsRead,
  conversationHasUnread,
  getOtherParticipantFromConversation,
  isMessageFromMyBusiness,
  Conversation,
  Message,
} from '../../services/chat';

interface ConversationListItemProps {
  conversation: Conversation;
  otherParticipant: { id: string; name: string };
  lastMessagePreview: string;
  lastMessageTime?: Date;
  hasUnread: boolean;
  onPress: () => void;
  onDelete: (conversationId: string) => void;
  colors: any;
}

function ConversationListItem({
  conversation,
  otherParticipant,
  lastMessagePreview,
  lastMessageTime,
  hasUnread,
  onPress,
  onDelete,
  colors,
}: ConversationListItemProps) {
  const [logoUrl, setLogoUrl] = useState<string>('');
  const swipeableRef = useRef<Swipeable>(null);

  useEffect(() => {
    const loadLogo = async () => {
      try {
        const { doc, getDoc } = await import('firebase/firestore');
        const { db } = await import('../../config/firebase');
        if (db && otherParticipant.id) {
          const businessDoc = await getDoc(doc(db, 'businesses', otherParticipant.id));
          if (businessDoc.exists()) {
            setLogoUrl(businessDoc.data().logoUrl || '');
          }
        }
      } catch (error) {
        console.error('Error loading logo:', error);
      }
    };
    loadLogo();
  }, [otherParticipant.id]);

  const formatTime = (date: Date | undefined) => {
    if (!date) return '';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const handleDelete = () => {
    swipeableRef.current?.close();
    onDelete(conversation.id);
  };

  const renderRightActions = () => {
    return (
      <View
        style={{
          marginBottom: 12,
          borderRadius: 12,
          justifyContent: 'center',
          alignItems: 'flex-end',
          paddingRight: 20,
          backgroundColor: colors.error,
        }}
      >
        <TouchableOpacity
          onPress={handleDelete}
          style={{
            justifyContent: 'center',
            alignItems: 'center',
            width: 80,
            height: '100%',
          }}
        >
          <Ionicons name="trash" size={28} color="#FFFFFF" />
          <Text
            style={{
              color: '#FFFFFF',
              fontSize: 12,
              fontWeight: '600',
              marginTop: 4,
            }}
          >
            Delete
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      overshootRight={false}
      rightThreshold={40}
    >
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        <Card
          style={{
            marginBottom: 12,
            borderRadius: 12,
            backgroundColor: colors.surface,
          }}
          mode="elevated"
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: 12,
            }}
          >
            {logoUrl ? (
              <Avatar.Image
                size={50}
                source={{ uri: logoUrl }}
                style={{ marginRight: 12 }}
              />
            ) : (
              <Avatar.Icon
                size={50}
                icon="store"
                style={{ marginRight: 12, backgroundColor: colors.surfaceVariant }}
              />
            )}
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Text
                  style={{
                    flex: 1,
                    fontSize: 16,
                    fontWeight: hasUnread ? '700' : '600',
                    color: colors.text,
                  }}
                  numberOfLines={1}
                >
                  {otherParticipant.name}
                </Text>
                {hasUnread ? (
                  <View
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: colors.primary,
                    }}
                  />
                ) : null}
              </View>
              {lastMessagePreview ? (
                <Text
                  style={{
                    fontSize: 14,
                    color: hasUnread ? colors.text : colors.textSecondary,
                    fontWeight: hasUnread ? '600' : '400',
                    marginBottom: 4,
                  }}
                  numberOfLines={1}
                >
                  {lastMessagePreview}
                </Text>
              ) : null}
              {lastMessageTime && (
                <Text
                  style={{
                    fontSize: 12,
                    color: colors.textLight,
                  }}
                >
                  {formatTime(lastMessageTime)}
                </Text>
              )}
            </View>
            <Ionicons
              name="chevron-forward"
              size={24}
              color={colors.textSecondary}
            />
          </View>
        </Card>
      </TouchableOpacity>
    </Swipeable>
  );
}

export default function ChatScreen() {
  const { openDrawer } = useDrawer();
  const router = useRouter();
  const { businessId, businessReady, refreshBusinessId } = useBusinessContext();
  const effectiveBusinessId = businessId ?? auth?.currentUser?.uid ?? null;
  const params = useLocalSearchParams();
  const conversationId = params.conversationId as string | undefined;
  const routeOtherBusinessId = params.businessId as string | undefined;
  const routeOtherBusinessName = params.businessName as string | undefined;
  const pendingStartChat =
    !conversationId && !!routeOtherBusinessId && !!routeOtherBusinessName && !!effectiveBusinessId;

  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [startingChat, setStartingChat] = useState(false);
  const [startChatError, setStartChatError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [otherBusinessName, setOtherBusinessName] = useState<string>('');
  const [otherBusinessLogo, setOtherBusinessLogo] = useState<string>('');
  const [otherBusinessId, setOtherBusinessId] = useState<string>('');
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const messagesEndRef = useRef<View>(null);
  const prevBusinessIdRef = useRef<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      refreshBusinessId();
    }, [refreshBusinessId])
  );

  useEffect(() => {
    if (!effectiveBusinessId || !conversationId) {
      prevBusinessIdRef.current = effectiveBusinessId;
      return;
    }
    if (prevBusinessIdRef.current && prevBusinessIdRef.current !== effectiveBusinessId) {
      router.replace('/(drawer)/chat');
    }
    prevBusinessIdRef.current = effectiveBusinessId;
  }, [effectiveBusinessId, conversationId, router]);

  const loadBusinessLogo = useCallback(async (businessDocId: string) => {
    if (!businessDocId) {
      setOtherBusinessLogo('');
      return;
    }

    try {
      const { doc, getDoc } = await import('firebase/firestore');
      const { db } = await import('../../config/firebase');
      if (!db) return;

      const businessDoc = await getDoc(doc(db, 'businesses', businessDocId));
      if (businessDoc.exists()) {
        setOtherBusinessLogo(businessDoc.data().logoUrl || '');
      } else {
        setOtherBusinessLogo('');
      }
    } catch (error) {
      console.error('Error loading business logo:', error);
      setOtherBusinessLogo('');
    }
  }, []);

  const applyOtherParticipant = useCallback(
    async (otherId: string, fallbackName?: string, viewerBusinessId?: string | null) => {
      if (!otherId || otherId === viewerBusinessId) {
        setOtherBusinessId('');
        setOtherBusinessName(fallbackName || 'Business');
        setOtherBusinessLogo('');
        return;
      }

      setOtherBusinessId(otherId);
      const name = await getBusinessName(otherId);
      setOtherBusinessName(name || fallbackName || 'Business');
      await loadBusinessLogo(otherId);
    },
    [loadBusinessLogo]
  );

  useEffect(() => {
    if (conversationId) return;
    if (!routeOtherBusinessId || !routeOtherBusinessName || !effectiveBusinessId) return;

    let cancelled = false;
    setStartingChat(true);
    setStartChatError(null);

    (async () => {
      try {
        const id = await getOrCreateConversation(routeOtherBusinessId, routeOtherBusinessName);
        if (!cancelled) {
          router.replace({
            pathname: '/(drawer)/chat',
            params: {
              conversationId: id,
              businessId: routeOtherBusinessId,
              businessName: routeOtherBusinessName,
            },
          });
        }
      } catch (error: unknown) {
        if (!cancelled) {
          console.error('Error starting chat:', error);
          const err = error as { message?: string; code?: string };
          const message =
            err.code === 'permission-denied' || err.message?.includes('permission')
              ? 'Permission denied. Deploy Firestore chat rules, then try again.'
              : err.message || 'Could not start this conversation.';
          setStartChatError(message);
          if (Platform.OS === 'web') {
            window.alert(message);
          } else {
            Alert.alert('Chat unavailable', message);
          }
        }
      } finally {
        if (!cancelled) {
          setStartingChat(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [conversationId, routeOtherBusinessId, routeOtherBusinessName, effectiveBusinessId, router]);

  useEffect(() => {
    if (conversationId || !effectiveBusinessId || pendingStartChat) return;

    let cancelled = false;
    setMessages([]);
    setActiveConversation(null);
    setLoading(true);
    setLoadError(null);

    const loadingTimeout = setTimeout(() => {
      if (!cancelled) setLoading(false);
    }, 8000);

    getConversations(effectiveBusinessId)
      .then((convs) => {
        if (!cancelled) {
          setConversations(convs);
          setLoading(false);
        }
      })
      .catch((error) => {
        console.error('Error loading conversations:', error);
        if (!cancelled) {
          setLoadError('Could not load conversations. Pull to refresh.');
          setLoading(false);
        }
      });

    const unsubscribe = subscribeToConversations(
      (convs) => {
        if (!cancelled) {
          setConversations(convs);
          setLoading(false);
          setLoadError(null);
        }
      },
      effectiveBusinessId,
      (error) => {
        if (!cancelled) {
          const message =
            error?.code === 'permission-denied'
              ? 'Live updates paused — re-select your business in Dev Console, then pull to refresh.'
              : 'Live updates paused. Pull to refresh for the latest conversations.';
          setLoadError(message);
          setLoading(false);
        }
      }
    );

    return () => {
      cancelled = true;
      clearTimeout(loadingTimeout);
      unsubscribe();
    };
  }, [conversationId, effectiveBusinessId, pendingStartChat]);

  useEffect(() => {
    if (!conversationId || !effectiveBusinessId) return;

    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    const loadingTimeout = setTimeout(() => {
      if (!cancelled) setLoading(false);
    }, 8000);

    const unsubscribeConversation = subscribeToConversation(conversationId, (conv) => {
      setActiveConversation(conv);
      if (!conv || !effectiveBusinessId) return;

      const other = getOtherParticipantFromConversation(conv, effectiveBusinessId);
      applyOtherParticipant(other.id, other.name || routeOtherBusinessName, effectiveBusinessId);
    });

    const unsubscribeMessages = subscribeToMessages(
      conversationId,
      (msgs) => {
        if (!cancelled) {
          setMessages(msgs);
          setLoading(false);
          markMessagesAsRead(conversationId).catch((error) => {
            console.warn('Could not mark messages as read:', error);
          });
        }
      },
      () => {
        if (!cancelled) {
          setLoadError('Could not load messages.');
          setLoading(false);
        }
      }
    );

    return () => {
      cancelled = true;
      clearTimeout(loadingTimeout);
      unsubscribeConversation();
      unsubscribeMessages();
    };
  }, [conversationId, effectiveBusinessId, applyOtherParticipant, routeOtherBusinessName]);

  useEffect(() => {
    if (messages.length > 0 && scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleRefresh = useCallback(async () => {
    if (!effectiveBusinessId) return;
    setRefreshing(true);
    setLoadError(null);
    try {
      await refreshBusinessId();
      const convs = await getConversations(effectiveBusinessId);
      setConversations(convs);
    } catch (error) {
      console.error('Refresh failed:', error);
      setLoadError('Could not refresh conversations.');
    } finally {
      setRefreshing(false);
    }
  }, [effectiveBusinessId, refreshBusinessId]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || !conversationId || sending) return;

    try {
      setSending(true);
      await sendMessage(conversationId, messageText.trim());
      setMessageText('');
    } catch (error: unknown) {
      console.error('Error sending message:', error);
      const err = error as { message?: string; code?: string };
      const message =
        err.code === 'permission-denied' || err.message?.includes('permission')
          ? 'Permission denied. Make sure Firestore chat rules are deployed.'
          : err.message || 'Failed to send message. Please try again.';
      Alert.alert('Message not sent', message);
    } finally {
      setSending(false);
    }
  };

  const handleConversationPress = async (conv: Conversation) => {
    if (!effectiveBusinessId) return;
    const other = getOtherParticipantFromConversation(conv, effectiveBusinessId);
    if (!other.id || other.id === effectiveBusinessId) return;

    router.push({
      pathname: '/(drawer)/chat',
      params: {
        conversationId: conv.id,
        businessId: other.id,
        businessName: other.name,
      },
    });
  };

  const handleDeleteConversation = (conversationId: string) => {
    const conversation = conversations.find((c) => c.id === conversationId);
    const otherParticipant = conversation
      ? getOtherParticipant(conversation)
      : { id: '', name: 'this conversation' };

    Alert.alert(
      'Delete Conversation',
      `Are you sure you want to delete the conversation with ${otherParticipant.name}? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteConversation(conversationId);
              // If we're currently viewing this conversation, go back to list
              if (conversationId === params.conversationId) {
                router.back();
              }
            } catch (error: any) {
              console.error('Error deleting conversation:', error);
              const errorMessage = error.message || 'Failed to delete conversation. Please try again.';
              
              Alert.alert(
                'Cannot Delete Conversation',
                errorMessage,
                [
                  {
                    text: 'OK',
                    style: 'default',
                  },
                ]
              );
            }
          },
        },
      ]
    );
  };

  const getOtherParticipant = (conv: Conversation) => {
    if (!effectiveBusinessId) {
      return { id: '', name: 'Business' };
    }
    return getOtherParticipantFromConversation(conv, effectiveBusinessId);
  };

  const formatTime = (date: Date | undefined) => {
    if (!date) return '';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      padding: 16,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 60,
    },
    emptyStateText: {
      color: colors.text,
      fontWeight: '700',
      marginTop: 24,
      marginBottom: 8,
      fontSize: 18,
    },
    emptyStateSubtext: {
      color: colors.textSecondary,
      textAlign: 'center',
      fontSize: 14,
    },
    conversationCard: {
      marginBottom: 12,
      borderRadius: 12,
      backgroundColor: colors.surface,
    },
    conversationContent: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
    },
    conversationAvatar: {
      marginRight: 12,
    },
    conversationInfo: {
      flex: 1,
    },
    conversationName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 4,
    },
    conversationLastMessage: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    conversationTime: {
      fontSize: 12,
      color: colors.textLight,
    },
    messagesContainer: {
      flex: 1,
      padding: 16,
    },
    messageBubble: {
      maxWidth: '75%',
      padding: 12,
      borderRadius: 16,
      marginBottom: 8,
    },
    messageBubbleSent: {
      backgroundColor: colors.primary,
      alignSelf: 'flex-end',
      borderBottomRightRadius: 4,
    },
    messageBubbleReceived: {
      backgroundColor: colors.surfaceVariant,
      alignSelf: 'flex-start',
      borderBottomLeftRadius: 4,
    },
    messageText: {
      fontSize: 15,
      color: colors.text,
    },
    messageTextSent: {
      color: '#FFFFFF',
    },
    messageTime: {
      fontSize: 11,
      color: colors.textLight,
      marginTop: 4,
    },
    messageTimeSent: {
      color: 'rgba(255, 255, 255, 0.7)',
    },
    messageSender: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 4,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    input: {
      flex: 1,
      marginRight: 8,
      backgroundColor: colors.surfaceVariant,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 60,
    },
    chatHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      paddingTop: 60,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    headerBackButton: {
      padding: 8,
      marginRight: 8,
    },
    headerProfileSection: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 4,
    },
    headerAvatar: {
      marginRight: 12,
    },
    headerTitleContainer: {
      flex: 1,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 2,
    },
    headerSubtitle: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    headerRightSpacer: {
      width: 40,
    },
  });

  // Conversation List View
  if (!conversationId) {
    return (
      <View style={styles.container}>
        <Header title="Chat" onMenuPress={openDrawer} />
        {pendingStartChat && (startingChat || !startChatError) ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ color: colors.textSecondary, marginTop: 16, textAlign: 'center' }}>
              Opening chat with {routeOtherBusinessName}...
            </Text>
          </View>
        ) : pendingStartChat && startChatError ? (
          <View style={[styles.loadingContainer, { paddingHorizontal: 24 }]}>
            <Ionicons name="alert-circle-outline" size={48} color={colors.warning} />
            <Text style={{ color: colors.text, marginTop: 16, textAlign: 'center', fontWeight: '600' }}>
              Could not start chat
            </Text>
            <Text style={{ color: colors.textSecondary, marginTop: 8, textAlign: 'center' }}>
              {startChatError}
            </Text>
            <Button
              mode="contained"
              style={{ marginTop: 20 }}
              onPress={() => router.replace('/(drawer)/chat')}
            >
              Back to inbox
            </Button>
          </View>
        ) : !effectiveBusinessId ? (
          <View style={styles.loadingContainer}>
            <Text style={{ color: colors.textSecondary }}>Sign in to use chat.</Text>
          </View>
        ) : loading && conversations.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ color: colors.textSecondary, marginTop: 16 }}>
              {businessReady ? 'Loading conversations...' : 'Preparing your business profile...'}
            </Text>
          </View>
        ) : conversations.length === 0 ? (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
          >
            <View style={styles.emptyState}>
              <Ionicons
                name="chatbubbles"
                size={64}
                color={colors.textLight}
              />
              <Text variant="headlineSmall" style={styles.emptyStateText}>
                No Messages
              </Text>
              <Text variant="bodyMedium" style={styles.emptyStateSubtext}>
                Your conversations with other businesses will appear here
              </Text>
            </View>
          </ScrollView>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
          >
            {loadError ? (
              <Text style={{ color: colors.warning, marginBottom: 12, textAlign: 'center' }}>
                {loadError}
              </Text>
            ) : null}
            {conversations.map((conv) => {
              const other = getOtherParticipant(conv);
              const isLastMessageFromMe = conv.lastMessageSenderId === effectiveBusinessId;
              const lastMessagePreview = isLastMessageFromMe
                ? `You: ${conv.lastMessage || ''}`
                : conv.lastMessage || '';
              const hasUnread = conversationHasUnread(conv, effectiveBusinessId || undefined);

              return (
                <ConversationListItem
                  key={conv.id}
                  conversation={conv}
                  otherParticipant={other}
                  lastMessagePreview={lastMessagePreview}
                  lastMessageTime={conv.lastMessageTime || conv.updatedAt}
                  hasUnread={hasUnread}
                  onPress={() => handleConversationPress(conv)}
                  onDelete={handleDeleteConversation}
                  colors={colors}
                />
              );
            })}
          </ScrollView>
        )}
      </View>
    );
  }

  const handleViewProfile = () => {
    const profileId = otherBusinessId || routeOtherBusinessId;
    if (profileId) {
      router.push({
        pathname: '/(drawer)/business-details',
        params: { businessId: profileId },
      });
    }
  };

  const headerOtherName =
    otherBusinessId && effectiveBusinessId && otherBusinessId !== effectiveBusinessId
      ? otherBusinessName
      : activeConversation && effectiveBusinessId
        ? getOtherParticipantFromConversation(activeConversation, effectiveBusinessId).name
        : otherBusinessName || routeOtherBusinessName || 'Business';

  // Message View
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Custom Header with Profile Access */}
      <View style={styles.chatHeader}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerBackButton}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={colors.text}
          />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleViewProfile}
          style={styles.headerProfileSection}
          activeOpacity={0.7}
        >
          {otherBusinessLogo ? (
            <Avatar.Image
              size={40}
              source={{ uri: otherBusinessLogo }}
              style={styles.headerAvatar}
            />
          ) : (
            <Avatar.Icon
              size={40}
              icon="store"
              style={[styles.headerAvatar, { backgroundColor: colors.surfaceVariant }]}
            />
          )}
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {headerOtherName}
            </Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              Tap to view profile
            </Text>
          </View>
        </TouchableOpacity>
        <View style={styles.headerRightSpacer} />
      </View>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ color: colors.textSecondary, marginTop: 16 }}>
            Loading messages...
          </Text>
        </View>
      ) : (
        <>
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            contentContainerStyle={{ paddingBottom: 16 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
          >
            {messages.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons
                  name="chatbubble-outline"
                  size={48}
                  color={colors.textLight}
                />
                <Text style={styles.emptyStateText}>No messages yet</Text>
                <Text style={styles.emptyStateSubtext}>
                  Start the conversation by sending a message
                </Text>
              </View>
            ) : (
              messages.map((message) => {
                const isSent = isMessageFromMyBusiness(message, effectiveBusinessId);
                return (
                  <View key={message.id}>
                    {!isSent && (
                      <Text style={styles.messageSender}>{message.senderName}</Text>
                    )}
                    <View
                      style={[
                        styles.messageBubble,
                        isSent ? styles.messageBubbleSent : styles.messageBubbleReceived,
                      ]}
                    >
                      <Text
                        style={[
                          styles.messageText,
                          isSent ? styles.messageTextSent : {},
                        ]}
                      >
                        {message.text}
                      </Text>
                      <Text
                        style={[
                          styles.messageTime,
                          isSent ? styles.messageTimeSent : {},
                        ]}
                      >
                        {formatTime(message.createdAt)}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
            <View ref={messagesEndRef} />
          </ScrollView>
          <View style={styles.inputContainer}>
            <TextInput
              value={messageText}
              onChangeText={setMessageText}
              placeholder="Type a message..."
              mode="outlined"
              style={styles.input}
              multiline
              maxLength={500}
              onSubmitEditing={() => {
                if (Platform.OS !== 'web') {
                  handleSendMessage();
                }
              }}
              blurOnSubmit={false}
              returnKeyType="send"
              disabled={sending}
            />
            <IconButton
              icon="send"
              size={24}
              iconColor={colors.primary}
              onPress={handleSendMessage}
              disabled={!messageText.trim() || sending}
            />
          </View>
        </>
      )}
    </KeyboardAvoidingView>
  );
}
