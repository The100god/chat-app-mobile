import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../src/context/AuthContext';
import { useTheme } from '../../../src/context/ThemeContext';
import { apiFetch } from '../../../src/utils/apiFetch';
import { getApiUrl } from '../../../src/utils/apiUrl';
import * as ImagePicker from 'expo-image-picker';
import { showToast } from '../../../src/components/Toast';
import {
  Camera,
  Pencil,
  Mail,
  X,
  Check,
  ArrowLeft,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AnimatedEmojiBackground } from '../../../src/components/AnimatedEmojiBackground';

export default function ProfileEditScreen() {
  const router = useRouter();
  const { user, refreshUserData } = useAuth();
  const { theme } = useTheme();

  const [username, setUsername] = useState(user.username || '');
  const [about, setAbout] = useState(user.about || "Hey there! I'm using Chugli.");
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingAbout, setIsEditingAbout] = useState(false);

  // Field-specific loading states
  const [updatingPic, setUpdatingPic] = useState(false);
  const [updatingName, setUpdatingName] = useState(false);
  const [updatingAbout, setUpdatingAbout] = useState(false);

  const [previewModal, setPreviewModal] = useState(false);
  const [imageError, setImageError] = useState(false);

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const isImageNotFound = (pic?: string) => {
    if (!pic) return true;
    return pic.trim() === '';
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0].base64) {
        const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
        setImageError(false);
        setUpdatingPic(true);
        try {
          const res = await apiFetch(`${getApiUrl()}/api/users/updateProfile`, {
            method: 'PUT',
            body: JSON.stringify({ profilePic: base64Image }),
          });
          if (res.ok) {
            showToast('Profile photo updated!', 'success');
            await refreshUserData();
          } else {
            const data = await res.json();
            showToast(data.message || 'Failed to update photo.', 'error');
          }
        } catch (err: any) {
          showToast(err.message || 'Network error updating photo.', 'error');
        } finally {
          setUpdatingPic(false);
        }
      }
    } catch (err) {
      console.error('Image picking error:', err);
    }
  };

  const handleSaveName = async () => {
    if (!username.trim()) return;
    if (username.trim() === user.username) {
      setIsEditingName(false);
      return;
    }
    setUpdatingName(true);
    try {
      const res = await apiFetch(`${getApiUrl()}/api/users/updateProfile`, {
        method: 'PUT',
        body: JSON.stringify({ username: username.trim() }),
      });
      if (res.ok) {
        showToast('Username updated successfully!', 'success');
        await refreshUserData();
        setIsEditingName(false);
      } else {
        const data = await res.json();
        showToast(data.message || 'Failed to update username.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Network error updating username.', 'error');
    } finally {
      setUpdatingName(false);
    }
  };

  const handleSaveAbout = async () => {
    if (about.trim() === user.about) {
      setIsEditingAbout(false);
      return;
    }
    setUpdatingAbout(true);
    try {
      const res = await apiFetch(`${getApiUrl()}/api/users/updateProfile`, {
        method: 'PUT',
        body: JSON.stringify({ about: about.trim() }),
      });
      if (res.ok) {
        showToast('About status updated!', 'success');
        await refreshUserData();
        setIsEditingAbout(false);
      } else {
        const data = await res.json();
        showToast(data.message || 'Failed to update status.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Network error updating status.', 'error');
    } finally {
      setUpdatingAbout(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      {/* Background Faint Floating Emojis matching web */}
      <AnimatedEmojiBackground />

      {/* Top Navigation Bar */}
      <View style={[styles.headerBar, { borderBottomColor: theme.border, backgroundColor: theme.card }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={22} color={theme.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.foreground }]}>Profile</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Web Profile Card Container */}
        <View style={[styles.webProfileCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {/* Avatar Container */}
          <View style={styles.avatarContainer}>
            {isImageNotFound(user?.profilePic) || imageError ? (
              <View style={[styles.avatarFallbackGradient, { borderColor: theme.accent }]}>
                <Text style={styles.avatarFallbackText}>{getInitials(user?.username)}</Text>
              </View>
            ) : (
              <TouchableOpacity onPress={() => setPreviewModal(true)} activeOpacity={0.9}>
                <Image
                  source={{ uri: user?.profilePic }}
                  style={[styles.avatarImage, { borderColor: theme.accent }]}
                  onError={() => setImageError(true)}
                />
              </TouchableOpacity>
            )}

            {/* Circular Camera Button / Loader on Avatar */}
            <TouchableOpacity
              style={[styles.cameraBadge, { backgroundColor: theme.accent }]}
              onPress={handlePickImage}
              disabled={updatingPic}
            >
              {updatingPic ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Camera size={18} color="#ffffff" />
              )}
            </TouchableOpacity>
          </View>

          {/* Change Photo Button */}
          <TouchableOpacity
            style={[styles.changePhotoPill, { borderColor: theme.accent, backgroundColor: theme.muted }]}
            onPress={handlePickImage}
            disabled={updatingPic}
          >
            {updatingPic ? (
              <ActivityIndicator size="small" color={theme.accent} style={{ marginRight: 6 }} />
            ) : (
              <Camera size={15} color={theme.accent} style={{ marginRight: 6 }} />
            )}
            <Text style={[styles.changePhotoText, { color: theme.foreground }]}>
              {updatingPic ? 'Uploading...' : 'Change photo'}
            </Text>
          </TouchableOpacity>

          {/* Username Row */}
          <View style={styles.usernameRow}>
            {isEditingName ? (
              <View style={styles.inlineEditBox}>
                <TextInput
                  style={[styles.nameInput, { color: theme.foreground, backgroundColor: theme.input, borderColor: theme.border }]}
                  value={username}
                  onChangeText={setUsername}
                  autoFocus
                  editable={!updatingName}
                />
                <TouchableOpacity
                  style={[styles.actionCheckBtn, { backgroundColor: theme.accent }]}
                  onPress={handleSaveName}
                  disabled={updatingName}
                >
                  {updatingName ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Check size={18} color="#ffffff" />
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.nameDisplayRow}>
                <Text style={[styles.usernameText, { color: theme.foreground }]}>
                  {user?.username}
                </Text>
                <TouchableOpacity style={styles.pencilIconButton} onPress={() => setIsEditingName(true)}>
                  <Pencil size={20} color={theme.accent} />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Personalize Subtitle */}
          <Text style={[styles.subText, { color: theme.mutedText }]}>
            Personalize your profile to make it feel like home.
          </Text>

          {/* About Status Section */}
          <View style={styles.aboutRowSection}>
            {isEditingAbout ? (
              <View style={styles.inlineEditBox}>
                <TextInput
                  style={[styles.aboutTextArea, { color: theme.foreground, backgroundColor: theme.input, borderColor: theme.border }]}
                  value={about}
                  onChangeText={setAbout}
                  multiline
                  autoFocus
                  editable={!updatingAbout}
                />
                <TouchableOpacity
                  style={[styles.actionCheckBtn, { backgroundColor: theme.accent }]}
                  onPress={handleSaveAbout}
                  disabled={updatingAbout}
                >
                  {updatingAbout ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Check size={18} color="#ffffff" />
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.aboutDisplayRow}>
                <Text style={[styles.aboutText, { color: theme.foreground }]}>
                  {user?.about || "Hey there! I'm using Chugli."}
                </Text>
                <TouchableOpacity style={styles.pencilIconButton} onPress={() => setIsEditingAbout(true)}>
                  <Pencil size={18} color={theme.accent} />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Email Section */}
          <View style={styles.emailContainer}>
            <Mail size={18} color={theme.accent} style={{ marginRight: 8 }} />
            <Text style={[styles.emailText, { color: theme.mutedText }]}>{user?.email}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Fullscreen Avatar Preview Modal matching web */}
      <Modal visible={previewModal} transparent animationType="fade">
        <View style={styles.previewModalOverlay}>
          <TouchableOpacity style={styles.closePreviewBtn} onPress={() => setPreviewModal(false)}>
            <X size={22} color="#ffffff" />
          </TouchableOpacity>
          {user?.profilePic ? (
            <Image source={{ uri: user.profilePic }} style={styles.fullPreviewImage} resizeMode="contain" />
          ) : (
            <View style={[styles.fullPreviewFallback, { backgroundColor: theme.accent }]}>
              <Text style={styles.fullPreviewInitials}>{getInitials(user?.username)}</Text>
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  floatingContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  floatingEmoji: {
    position: 'absolute',
    fontSize: 28,
    opacity: 0.25,
  },
  headerBar: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    zIndex: 10,
  },
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  scrollContent: {
    padding: 20,
    alignItems: 'center',
  },
  webProfileCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatarImage: {
    width: 128,
    height: 128,
    borderRadius: 64,
    borderWidth: 4,
  },
  avatarFallbackGradient: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: '#0d9488',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
  },
  avatarFallbackText: {
    color: '#ffffff',
    fontSize: 42,
    fontWeight: '800',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  changePhotoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 20,
  },
  changePhotoText: {
    fontSize: 13,
    fontWeight: '600',
  },
  usernameRow: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 6,
  },
  nameDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  usernameText: {
    fontSize: 26,
    fontWeight: '800',
  },
  pencilIconButton: {
    padding: 6,
    borderRadius: 8,
  },
  inlineEditBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '90%',
  },
  nameInput: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 18,
    fontWeight: '700',
  },
  actionCheckBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subText: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 20,
  },
  aboutRowSection: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  aboutDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  aboutText: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
  },
  aboutTextArea: {
    flex: 1,
    height: 70,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  emailContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  emailText: {
    fontSize: 15,
    fontWeight: '500',
  },
  previewModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closePreviewBtn: {
    position: 'absolute',
    top: 48,
    right: 20,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#dc2626',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  fullPreviewImage: {
    width: '88%',
    height: '75%',
  },
  fullPreviewFallback: {
    width: 220,
    height: 220,
    borderRadius: 110,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullPreviewInitials: {
    color: '#ffffff',
    fontSize: 72,
    fontWeight: '800',
  },
});
