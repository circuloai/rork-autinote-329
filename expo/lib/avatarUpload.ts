import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { Alert, Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

export const AVATAR_BUCKET = 'avatars';

// The `avatars` bucket is PRIVATE. Access is controlled by Supabase Storage
// RLS (owner can always read their own files; a therapist can read a
// caregiver's or child's avatar only if they have an ACCEPTED shared_access
// row for that caregiver). Because the bucket is private, we can't use
// `getPublicUrl` (it would 404/403 for anyone without a valid Supabase auth
// header, which <Image>/<img> tags never send). Instead we mint a signed URL
// at upload time — creating it still goes through the same SELECT RLS check,
// so only the uploader (who owns the file) can generate it. The resulting
// capability URL is then stored on the profile/child row like any other
// avatar value, and becomes visible only to whoever is allowed to read that
// row (owner + accepted therapists), matching the existing sharing model.
const SIGNED_URL_EXPIRY_SECONDS = 60 * 60 * 24 * 365 * 10; // 10 years

async function ensureLibraryPermission(): Promise<boolean> {
  const { status, canAskAgain } = await ImagePicker.getMediaLibraryPermissionsAsync();
  if (status === 'granted') return true;

  if (!canAskAgain && status === 'denied') {
    Alert.alert(
      'Photo Access Needed',
      'AutiNote needs permission to access your photo library to set a profile picture. Please enable photo access in your device settings.',
    );
    return false;
  }

  const { status: newStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (newStatus !== 'granted') {
    Alert.alert(
      'Photo Access Needed',
      'AutiNote needs permission to access your photo library so you can choose a profile picture.',
    );
    return false;
  }
  return true;
}

export async function pickImageFromLibrary(): Promise<string | null> {
  const hasPermission = await ensureLibraryPermission();
  if (!hasPermission) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.9,
  });

  if (result.canceled || !result.assets || result.assets.length === 0) {
    return null;
  }

  return result.assets[0].uri;
}

async function prepareAvatarFile(uri: string): Promise<{ uri: string; contentType: string }> {
  const manipulated = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 512, height: 512 } }],
    { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG },
  );
  return { uri: manipulated.uri, contentType: 'image/jpeg' };
}

async function uriToArrayBuffer(uri: string): Promise<ArrayBuffer> {
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    return await response.arrayBuffer();
  }

  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const binary = globalThis.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export type AvatarUploadTarget =
  | { kind: 'profile'; userId: string }
  | { kind: 'child'; userId: string; childId: string };

export function getAvatarStoragePath(target: AvatarUploadTarget): string {
  if (target.kind === 'profile') {
    return `${target.userId}/profile.jpg`;
  }
  return `${target.userId}/children/${target.childId}/avatar.jpg`;
}

export async function uploadAvatarImage(
  localUri: string,
  target: AvatarUploadTarget,
): Promise<string> {
  const { uri, contentType } = await prepareAvatarFile(localUri);
  const arrayBuffer = await uriToArrayBuffer(uri);
  const path = getAvatarStoragePath(target);

  const { error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, arrayBuffer, {
      contentType,
      upsert: true,
    });

  if (error) {
    throw error;
  }

  const { data, error: signError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .createSignedUrl(path, SIGNED_URL_EXPIRY_SECONDS);

  if (signError || !data?.signedUrl) {
    throw signError ?? new Error('Failed to create signed avatar URL');
  }

  return data.signedUrl;
}

export async function pickAndUploadAvatar(target: AvatarUploadTarget): Promise<string | null> {
  const localUri = await pickImageFromLibrary();
  if (!localUri) return null;
  return uploadAvatarImage(localUri, target);
}
