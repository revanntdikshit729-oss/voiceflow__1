import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { storage, isStorageConfigured, firebaseConfig } from './firebase';

export const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

export interface PhotoValidationResult {
  valid: boolean;
  errorKey?: 'photoTypeError' | 'photoSizeError' | 'photoUploadError';
  message?: string;
}

export const validatePhotoFile = (file: File): PhotoValidationResult => {
  if (!file) {
    return { valid: false, message: 'No file selected.' };
  }

  // Validate MIME type and file extension
  const ext = file.name.split('.').pop()?.toLowerCase();
  const validExt = ['jpg', 'jpeg', 'png', 'webp'].includes(ext || '');
  const validType = ALLOWED_IMAGE_TYPES.includes(file.type.toLowerCase()) || validExt;

  if (!validType) {
    return {
      valid: false,
      errorKey: 'photoTypeError',
      message: 'Only JPG, JPEG, PNG, and WEBP formats are supported.',
    };
  }

  // Validate size
  if (file.size > MAX_PHOTO_SIZE_BYTES) {
    return {
      valid: false,
      errorKey: 'photoSizeError',
      message: 'Image size exceeds the 5 MB limit.',
    };
  }

  return { valid: true };
};

export const storageService = {
  isConfigured(): boolean {
    return isStorageConfigured();
  },

  getBucketName(): string {
    return firebaseConfig.storageBucket || 'Not configured';
  },

  /**
   * Uploads a profile photo to Firebase Storage.
   * Path: profile_photos/<role>s/<userId>/photo_<timestamp>.<ext>
   */
  async uploadProfilePhoto(
    file: File,
    userId: string,
    role: 'patient' | 'doctor'
  ): Promise<string> {
    if (!storage || !firebaseConfig.storageBucket) {
      throw new Error(
        'Firebase Storage is not configured. Please enable Cloud Storage in your Firebase Console for project ' +
          firebaseConfig.projectId
      );
    }

    const validation = validatePhotoFile(file);
    if (!validation.valid) {
      throw new Error(validation.message);
    }

    const rawExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const ext = ['jpg', 'jpeg', 'png', 'webp'].includes(rawExt) ? rawExt : 'jpg';
    const folder = role === 'doctor' ? 'doctors' : 'patients';
    const filePath = `profile_photos/${folder}/${userId}/photo_${Date.now()}.${ext}`;

    const storageRef = ref(storage, filePath);
    const metadata = {
      contentType: file.type || `image/${ext === 'jpg' ? 'jpeg' : ext}`,
      customMetadata: {
        uploadedBy: userId,
        role,
        uploadedAt: new Date().toISOString(),
      },
    };

    console.log(`[Storage] Uploading profile photo to: ${filePath}`);
    const snapshot = await uploadBytes(storageRef, file, metadata);
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log(`[Storage] Upload succeeded! Download URL generated.`);

    return downloadURL;
  },

  /**
   * Deletes a profile photo from Firebase Storage if it matches the bucket URL.
   */
  async deleteProfilePhoto(photoURL: string): Promise<void> {
    if (!storage || !photoURL) return;

    try {
      // Only delete if it is a firebase storage URL
      if (photoURL.includes('firebasestorage.googleapis.com')) {
        const fileRef = ref(storage, photoURL);
        await deleteObject(fileRef);
        console.log('[Storage] Previous profile photo deleted from storage.');
      }
    } catch (err: any) {
      // If object doesn't exist or already removed, ignore error
      if (err.code !== 'storage/object-not-found') {
        console.warn('[Storage] Note during photo deletion:', err.message);
      }
    }
  },
};
