import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '../config/firebase';
import * as FileSystem from 'expo-file-system';
import { UserRole } from '../types/roles';
import { getCurrentBusinessId } from './rbac';

export interface BusinessProfile {
  uid: string;
  email: string;
  businessName: string;
  businessType?: string;
  phoneNumber?: string;
  address?: string;
  role?: UserRole;
  storeId?: string;
  ownerBusinessId?: string;
  isTeamMember?: boolean;
  location?: string;
  workHours?: string;
  description?: string;
  services?: string;
  logoUrl?: string;
  coverImageUrl?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export const getBusinessProfile = async (): Promise<BusinessProfile | null> => {
  if (!auth?.currentUser || !db) {
    return null;
  }

  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) return null;
    const businessDoc = await getDoc(doc(db, 'businesses', businessId));
    if (businessDoc.exists()) {
      const data = businessDoc.data();
      return {
        ...data,
        uid: businessDoc.id,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
      } as BusinessProfile;
    }
    return null;
  } catch (error: any) {
    console.error('Error fetching business profile:', error);
    throw new Error(error.message || 'Failed to fetch business profile');
  }
};

export const updateBusinessProfile = async (
  updates: Partial<BusinessProfile>
): Promise<void> => {
  if (!auth?.currentUser || !db) {
    throw new Error('User not authenticated');
  }

  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error('Business profile not found');
    }
    const businessRef = doc(db, 'businesses', businessId);
    const updateData: any = {
      ...updates,
      updatedAt: new Date(),
    };
    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });
    await updateDoc(businessRef, updateData);
  } catch (error: any) {
    console.error('Error updating business profile:', error);
    throw new Error(error.message || 'Failed to update business profile');
  }
};

export const uploadBusinessLogo = async (imageUri: string): Promise<string> => {
  if (!auth?.currentUser) {
    throw new Error('User not authenticated. Please log in first.');
  }

  if (!storage) {
    throw new Error('Firebase Storage is not configured. Please check your Firebase setup and ensure Storage is enabled in Firebase Console.');
  }

  try {
    console.log('Starting logo upload...', imageUri);
    
    // Use fetch for local file URIs (works better in React Native)
    let blob: Blob;
    try {
      const response = await fetch(imageUri);
      if (!response.ok) {
        throw new Error(`Failed to read image file: ${response.status}`);
      }
      blob = await response.blob();
      console.log('File read via fetch, size:', blob.size, 'bytes');
    } catch (fetchError) {
      // Fallback to expo-file-system if fetch fails
      console.log('Fetch failed, trying expo-file-system...');
      // Read file as base64 string
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: 'base64' as any,
      });
      
      // Convert base64 to blob using a more compatible method
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      blob = new Blob([byteArray], { type: 'image/jpeg' });
      console.log('File read via expo-file-system, size:', blob.size, 'bytes');
    }

    // Create a reference to the file location
    const businessId = await getCurrentBusinessId();
    const logoRef = ref(storage, `businesses/${businessId || auth.currentUser.uid}/logo.jpg`);

    console.log('Uploading to Firebase Storage...');
    // Upload the file
    await uploadBytes(logoRef, blob);
    console.log('Upload complete, getting download URL...');

    // Get the download URL
    const downloadURL = await getDownloadURL(logoRef);
    console.log('Download URL obtained:', downloadURL);

    // Update the profile with the logo URL
    await updateBusinessProfile({ logoUrl: downloadURL });
    console.log('Profile updated successfully');

    return downloadURL;
  } catch (error: any) {
    console.error('Error uploading logo:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    
    // Provide more helpful error messages
    if (error.code === 'storage/unauthorized') {
      throw new Error('Permission denied. Please check your Firebase Storage security rules.');
    } else if (error.code === 'storage/unknown') {
      throw new Error('Storage error. Please ensure Firebase Storage is enabled in Firebase Console and security rules are published.');
    } else if (error.code === 'storage/object-not-found') {
      throw new Error('Storage bucket not found. Please enable Firebase Storage in Firebase Console.');
    } else if (error.message) {
      throw new Error(error.message);
    }
    
    throw new Error('Failed to upload logo. Please check your Firebase Storage configuration.');
  }
};

export const uploadBusinessCoverImage = async (imageUri: string): Promise<string> => {
  if (!auth?.currentUser) {
    throw new Error('User not authenticated. Please log in first.');
  }

  if (!storage) {
    throw new Error('Firebase Storage is not configured. Please check your Firebase setup and ensure Storage is enabled in Firebase Console.');
  }

  try {
    console.log('Starting cover image upload...', imageUri);
    
    // Use fetch for local file URIs (works better in React Native)
    let blob: Blob;
    try {
      const response = await fetch(imageUri);
      if (!response.ok) {
        throw new Error(`Failed to read image file: ${response.status}`);
      }
      blob = await response.blob();
      console.log('File read via fetch, size:', blob.size, 'bytes');
    } catch (fetchError) {
      // Fallback to expo-file-system if fetch fails
      console.log('Fetch failed, trying expo-file-system...');
      // Read file as base64 string
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: 'base64' as any,
      });
      
      // Convert base64 to blob using a more compatible method
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      blob = new Blob([byteArray], { type: 'image/jpeg' });
      console.log('File read via expo-file-system, size:', blob.size, 'bytes');
    }

    // Create a reference to the file location
    const businessId = await getCurrentBusinessId();
    const coverRef = ref(storage, `businesses/${businessId || auth.currentUser.uid}/cover.jpg`);

    console.log('Uploading to Firebase Storage...');
    // Upload the file
    await uploadBytes(coverRef, blob);
    console.log('Upload complete, getting download URL...');

    // Get the download URL
    const downloadURL = await getDownloadURL(coverRef);
    console.log('Download URL obtained:', downloadURL);

    // Update the profile with the cover image URL
    await updateBusinessProfile({ coverImageUrl: downloadURL });
    console.log('Profile updated successfully');

    return downloadURL;
  } catch (error: any) {
    console.error('Error uploading cover image:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    
    // Provide more helpful error messages
    if (error.code === 'storage/unauthorized') {
      throw new Error('Permission denied. Please check your Firebase Storage security rules.');
    } else if (error.code === 'storage/unknown') {
      throw new Error('Storage error. Please ensure Firebase Storage is enabled in Firebase Console and security rules are published.');
    } else if (error.code === 'storage/object-not-found') {
      throw new Error('Storage bucket not found. Please enable Firebase Storage in Firebase Console.');
    } else if (error.message) {
      throw new Error(error.message);
    }
    
    throw new Error('Failed to upload cover image. Please check your Firebase Storage configuration.');
  }
};

