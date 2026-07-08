import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { Alert, Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

export const AVATAR_BUCKET = 'avatars';

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

  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  return `${data.publicUrl}?t=${Date.now()}`;
}

export async function pickAndUploadAvatar(target: AvatarUploadTarget): Promise<string | null> {
  const localUri = await pickImageFromLibrary();
  if (!localUri) return null;
  return uploadAvatarImage(localUri, target);
}
