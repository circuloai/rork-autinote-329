import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Camera, User as UserIcon, X, Check } from 'lucide-react-native';
import ScaledText from '@/components/ScaledText';
import { AVATAR_OPTIONS, getAvatarById } from '@/constants/avatars';
import { pickAndUploadAvatar, type AvatarUploadTarget } from '@/lib/avatarUpload';
import { getColors } from '@/constants/colors';

interface AvatarPickerProps {
  avatarValue?: string;
  onChangeAvatar: (value: string) => void;
  uploadTarget: AvatarUploadTarget;
  size?: number;
  colors: ReturnType<typeof getColors>;
  testID?: string;
}

export default function AvatarPicker({
  avatarValue,
  onChangeAvatar,
  uploadTarget,
  size = 100,
  colors: Colors,
  testID,
}: AvatarPickerProps) {
  const [menuVisible, setMenuVisible] = useState(false);
  const [presetGridVisible, setPresetGridVisible] = useState(false);
  const [uploading, setUploading] = useState(false);

  const current = getAvatarById(avatarValue);
  const styles = createStyles(Colors, size);

  const handleUploadFromLibrary = useCallback(async () => {
    setMenuVisible(false);
    setUploading(true);
    try {
      const uploadedUrl = await pickAndUploadAvatar(uploadTarget);
      if (uploadedUrl) {
        onChangeAvatar(uploadedUrl);
      }
    } catch (err: any) {
      console.error('[AvatarPicker] Upload failed:', err);
      Alert.alert(
        'Upload Failed',
        err?.message || 'We could not upload that photo. Please try again.',
      );
    } finally {
      setUploading(false);
    }
  }, [uploadTarget, onChangeAvatar]);

  const handleChoosePreset = useCallback(() => {
    setMenuVisible(false);
    setPresetGridVisible(true);
  }, []);

  const handleSelectPreset = useCallback(
    (id: string) => {
      onChangeAvatar(id);
      setPresetGridVisible(false);
    },
    [onChangeAvatar],
  );

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity
        onPress={() => setMenuVisible(true)}
        activeOpacity={0.7}
        testID={testID}
      >
        <View style={[styles.avatarCircle, { backgroundColor: current?.bg || Colors.primary + '20' }]}>
          {uploading ? (
            <ActivityIndicator color={Colors.primary} />
          ) : current ? (
            <Image source={{ uri: current.url }} style={styles.avatarImage} />
          ) : (
            <UserIcon size={size * 0.4} color={Colors.textLight} />
          )}
        </View>
        <View style={[styles.editBadge, { backgroundColor: Colors.primary, borderColor: Colors.background }]}>
          <Camera size={12} color={Colors.surface} />
        </View>
      </TouchableOpacity>

      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setMenuVisible(false)}>
          <Pressable style={[styles.menuCard, { backgroundColor: Colors.surface }]}>
            <ScaledText style={[styles.menuTitle, { color: Colors.text }]}>Profile Picture</ScaledText>

            <TouchableOpacity
              style={styles.menuOption}
              onPress={handleUploadFromLibrary}
              activeOpacity={0.7}
              testID="avatar-upload-option"
            >
              <View style={[styles.menuIcon, { backgroundColor: Colors.primary + '15' }]}>
                <Camera size={20} color={Colors.primary} />
              </View>
              <ScaledText style={[styles.menuOptionText, { color: Colors.text }]}>
                Upload from Camera Roll
              </ScaledText>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuOption}
              onPress={handleChoosePreset}
              activeOpacity={0.7}
              testID="avatar-preset-option"
            >
              <View style={[styles.menuIcon, { backgroundColor: Colors.primary + '15' }]}>
                <UserIcon size={20} color={Colors.primary} />
              </View>
              <ScaledText style={[styles.menuOptionText, { color: Colors.text }]}>
                Choose a Preset Avatar
              </ScaledText>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuCancel}
              onPress={() => setMenuVisible(false)}
              activeOpacity={0.7}
            >
              <ScaledText style={[styles.menuCancelText, { color: Colors.textSecondary }]}>Cancel</ScaledText>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={presetGridVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPresetGridVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setPresetGridVisible(false)}>
          <Pressable style={[styles.gridCard, { backgroundColor: Colors.surface }]}>
            <View style={styles.gridHeader}>
              <ScaledText style={[styles.menuTitle, { color: Colors.text }]}>Choose an Avatar</ScaledText>
              <TouchableOpacity onPress={() => setPresetGridVisible(false)} style={styles.closeIcon}>
                <X size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.grid}>
              {AVATAR_OPTIONS.map((opt) => {
                const selected = avatarValue === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    testID={`avatar-preset-${opt.id}`}
                    onPress={() => handleSelectPreset(opt.id)}
                    style={[
                      styles.gridTile,
                      { backgroundColor: opt.bg },
                      selected && { borderColor: Colors.primary, borderWidth: 3 },
                    ]}
                  >
                    <Image source={{ uri: opt.url }} style={styles.gridTileImage} />
                    {selected && (
                      <View style={[styles.gridCheck, { backgroundColor: Colors.primary }]}>
                        <Check size={12} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const createStyles = (Colors: ReturnType<typeof getColors>, size: number) =>
  StyleSheet.create({
    wrapper: {
      alignItems: 'center',
    },
    avatarCircle: {
      width: size,
      height: size,
      borderRadius: size / 2,
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
    },
    avatarImage: {
      width: '100%',
      height: '100%',
    },
    editBadge: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: 28,
      height: 28,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
    },
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'flex-end',
    },
    menuCard: {
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      paddingBottom: 32,
    },
    menuTitle: {
      fontSize: 16,
      fontWeight: '700' as const,
      marginBottom: 16,
      textAlign: 'center',
    },
    menuOption: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      paddingVertical: 12,
    },
    menuIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    menuOptionText: {
      fontSize: 16,
      fontWeight: '600' as const,
    },
    menuCancel: {
      marginTop: 12,
      paddingVertical: 14,
      alignItems: 'center',
    },
    menuCancelText: {
      fontSize: 16,
      fontWeight: '600' as const,
    },
    gridCard: {
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      paddingBottom: 40,
      maxHeight: '70%',
    },
    gridHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    closeIcon: {
      padding: 4,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      justifyContent: 'flex-start',
    },
    gridTile: {
      width: 64,
      height: 64,
      borderRadius: 32,
      overflow: 'hidden',
      borderWidth: 2,
      borderColor: 'transparent',
      position: 'relative',
    },
    gridTileImage: {
      width: '100%',
      height: '100%',
    },
    gridCheck: {
      position: 'absolute',
      bottom: 2,
      right: 2,
      width: 20,
      height: 20,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: '#fff',
    },
  });
