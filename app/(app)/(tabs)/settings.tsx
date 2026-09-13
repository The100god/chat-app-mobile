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
  Switch,
} from 'react-native';
import { useAuth } from '../../../src/context/AuthContext';
import { useTheme } from '../../../src/context/ThemeContext';
import { apiFetch } from '../../../src/utils/apiFetch';
import { getApiUrl } from '../../../src/utils/apiUrl';
import { setLockPin, removeLockPin } from '../../../src/utils/authStorage';
import { showToast } from '../../../src/components/Toast';
import { UIModal } from '../../../src/components/UIModal';
import {
  User as UserIcon,
  Key,
  LogOut,
  ShieldCheck,
  Check,
  Bell,
  Trash2,
  Sun,
  Moon,
  Sparkles,
  ChevronRight,
} from 'lucide-react-native';

export default function SettingsTab() {
  const { user, logout, refreshUserData } = useAuth();
  const { mode, theme, setTheme } = useTheme();

  const [about, setAbout] = useState(user.about || "Hey there! I'm using Chugli.");
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');

  // Notifications Toggle
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // Password Modal
  const [isPassModalOpen, setIsPassModalOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPass, setChangingPass] = useState(false);
  const [passError, setPassError] = useState('');

  // PIN Modal
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pin, setPin] = useState('');

  // App Update state
  const [updatingApp, setUpdatingApp] = useState(false);

  // Delete Account Modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleUpdateProfile = async () => {
    setUpdatingProfile(true);
    setProfileMsg('');
    try {
      const res = await apiFetch(`${getApiUrl()}/api/users/updateProfile`, {
        method: 'PUT',
        body: JSON.stringify({ about: about.trim() }),
      });
      if (res.ok) {
        setProfileMsg('Profile updated successfully!');
        refreshUserData();
      }
    } catch (err) {
      console.error('Update profile error:', err);
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      setPassError('Please fill in all fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassError('New password and confirm password do not match.');
      return;
    }
    setChangingPass(true);
    setPassError('');
    try {
      const res = await apiFetch(`${getApiUrl()}/api/users/changePassword`, {
        method: 'PUT',
        body: JSON.stringify({ oldPassword, newPassword, confirmPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to change password.');

      showToast('Password changed successfully!', 'success');
      setIsPassModalOpen(false);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPassError(err.message);
    } finally {
      setChangingPass(false);
    }
  };

  const handleSavePin = async () => {
    if (pin.length < 4) {
      showToast('Please enter a 4-digit PIN.', 'warning');
      return;
    }
    try {
      await setLockPin(pin);
      showToast('PIN lock enabled successfully!', 'success');
      setIsPinModalOpen(false);
      setPin('');
    } catch (err) {
      console.error('Save PIN error:', err);
    }
  };

  const handleDisablePin = async () => {
    await removeLockPin();
    showToast('App Lock disabled.', 'info');
    setIsPinModalOpen(false);
    setPin('');
  };

  const handleCheckUpdate = () => {
    setUpdatingApp(true);
    setTimeout(() => {
      setUpdatingApp(false);
      showToast('You are using the latest version of Chugli Mobile!', 'success');
    }, 1200);
  };

  const handleClearCache = () => {
    showToast('Media and app cache cleared successfully!', 'success');
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return;
    setDeleting(true);
    try {
      const res = await apiFetch(`${getApiUrl()}/api/users/deleteAccount`, {
        method: 'DELETE',
      });
      if (res.ok) {
        logout();
      } else {
        const data = await res.json();
        showToast(data.message || 'Failed to delete account.', 'error');
      }
    } catch (err) {
      showToast('Something went wrong. Please try again.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Title */}
      <Text style={[styles.headerTitle, { color: theme.foreground }]}>Settings</Text>

      {/* Profile Card */}
      <View
        style={[
          styles.card,
          { backgroundColor: theme.card, borderColor: theme.border },
        ]}
      >
        <View style={styles.profileRow}>
          {user.profilePic ? (
            <Image
              source={{ uri: user.profilePic }}
              style={[styles.avatar, { borderColor: theme.accent }]}
            />
          ) : (
            <View style={[styles.avatarFallback, { backgroundColor: theme.accent }]}>
              <Text style={styles.avatarInitial}>
                {user.username ? user.username.charAt(0).toUpperCase() : 'U'}
              </Text>
            </View>
          )}
          <View style={styles.profileDetails}>
            <Text style={[styles.username, { color: theme.foreground }]}>
              {user.username}
            </Text>
            <Text style={[styles.email, { color: theme.mutedText }]}>{user.email}</Text>
          </View>
        </View>

        {/* Status / About me */}
        <View style={styles.aboutContainer}>
          <Text style={[styles.inputLabel, { color: theme.mutedText }]}>About Me</Text>
          {profileMsg ? (
            <Text style={styles.successMsg}>{profileMsg}</Text>
          ) : null}
          <View style={styles.inputWrapper}>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.input,
                  borderColor: theme.border,
                  color: theme.foreground,
                },
              ]}
              value={about}
              onChangeText={setAbout}
              placeholder="Status message..."
              placeholderTextColor={theme.mutedText}
            />
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: theme.accent }]}
              onPress={handleUpdateProfile}
              disabled={updatingProfile}
            >
              {updatingProfile ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Check size={18} color="#ffffff" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Account & Privacy Section */}
      <View
        style={[
          styles.card,
          { backgroundColor: theme.card, borderColor: theme.border },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: theme.foreground }]}>
          Account & Privacy
        </Text>

        <TouchableOpacity
          style={[styles.menuItem, { borderBottomColor: theme.border }]}
          onPress={() => setIsPassModalOpen(true)}
        >
          <View style={[styles.menuIconCircle, { backgroundColor: theme.muted }]}>
            <Key size={18} color={theme.accent} />
          </View>
          <View style={styles.menuInfo}>
            <Text style={[styles.menuTitle, { color: theme.foreground }]}>
              Change Password
            </Text>
            <Text style={[styles.menuSubtitle, { color: theme.mutedText }]}>
              Update your account password
            </Text>
          </View>
          <ChevronRight size={18} color={theme.mutedText} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, { borderBottomColor: theme.border }]}
          onPress={() => setIsPinModalOpen(true)}
        >
          <View style={[styles.menuIconCircle, { backgroundColor: theme.muted }]}>
            <ShieldCheck size={18} color={theme.accent} />
          </View>
          <View style={styles.menuInfo}>
            <Text style={[styles.menuTitle, { color: theme.foreground }]}>
              App Lock PIN
            </Text>
            <Text style={[styles.menuSubtitle, { color: theme.mutedText }]}>
              4-digit PIN security lock
            </Text>
          </View>
          <ChevronRight size={18} color={theme.mutedText} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItemLast}
          onPress={() => showToast('Your online status is visible to friends.', 'info')}
        >
          <View style={[styles.menuIconCircle, { backgroundColor: theme.muted }]}>
            <UserIcon size={18} color={theme.accent} />
          </View>
          <View style={styles.menuInfo}>
            <Text style={[styles.menuTitle, { color: theme.foreground }]}>
              Online Status
            </Text>
            <Text style={[styles.menuSubtitle, { color: theme.mutedText }]}>Visible</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Notifications Section */}
      <View
        style={[
          styles.card,
          { backgroundColor: theme.card, borderColor: theme.border },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: theme.foreground }]}>
          Notifications
        </Text>
        <View style={styles.toggleRow}>
          <View style={styles.toggleLabelRow}>
            <Bell size={18} color={theme.accent} style={{ marginRight: 10 }} />
            <Text style={[styles.menuTitle, { color: theme.foreground }]}>
              Message Notifications
            </Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ false: theme.border, true: theme.accent }}
            thumbColor="#ffffff"
          />
        </View>
      </View>

      {/* Chat Preferences (Theme Selector) */}
      <View
        style={[
          styles.card,
          { backgroundColor: theme.card, borderColor: theme.border },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: theme.foreground }]}>
          Chat Preferences
        </Text>
        <Text style={[styles.subLabel, { color: theme.mutedText }]}>
          App Theme ({mode.toUpperCase()})
        </Text>

        <View style={styles.themeRow}>
          <TouchableOpacity
            style={[
              styles.themeBtn,
              { backgroundColor: theme.muted, borderColor: theme.border },
              mode === 'light' && {
                backgroundColor: `${theme.accent}20`,
                borderColor: theme.accent,
              },
            ]}
            onPress={() => setTheme('light')}
          >
            <Sun
              size={18}
              color={mode === 'light' ? theme.accent : theme.mutedText}
              style={{ marginBottom: 4 }}
            />
            <Text
              style={[
                styles.themeBtnText,
                { color: mode === 'light' ? theme.accent : theme.mutedText },
              ]}
            >
              Light
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.themeBtn,
              { backgroundColor: theme.muted, borderColor: theme.border },
              mode === 'dark' && {
                backgroundColor: `${theme.accent}20`,
                borderColor: theme.accent,
              },
            ]}
            onPress={() => setTheme('dark')}
          >
            <Moon
              size={18}
              color={mode === 'dark' ? theme.accent : theme.mutedText}
              style={{ marginBottom: 4 }}
            />
            <Text
              style={[
                styles.themeBtnText,
                { color: mode === 'dark' ? theme.accent : theme.mutedText },
              ]}
            >
              Dark
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.themeBtn,
              { backgroundColor: theme.muted, borderColor: theme.border },
              mode === 'aurora' && {
                backgroundColor: 'rgba(0, 188, 212, 0.2)',
                borderColor: '#00bcd4',
              },
            ]}
            onPress={() => setTheme('aurora')}
          >
            <Sparkles
              size={18}
              color={mode === 'aurora' ? '#00bcd4' : theme.mutedText}
              style={{ marginBottom: 4 }}
            />
            <Text
              style={[
                styles.themeBtnText,
                { color: mode === 'aurora' ? '#00bcd4' : theme.mutedText },
              ]}
            >
              Aurora
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Storage & Media */}
      <View
        style={[
          styles.card,
          { backgroundColor: theme.card, borderColor: theme.border },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: theme.foreground }]}>
          Storage & Media
        </Text>
        <TouchableOpacity style={styles.actionRow} onPress={handleClearCache}>
          <Trash2 size={18} color="#ef4444" style={{ marginRight: 10 }} />
          <Text style={[styles.menuTitle, { color: theme.foreground }]}>
            Clear Media Cache
          </Text>
        </TouchableOpacity>
      </View>

      {/* App Updates & Version */}
      <View
        style={[
          styles.card,
          { backgroundColor: theme.card, borderColor: theme.border },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: theme.foreground }]}>
          App Updates & Version
        </Text>
        <View style={styles.updateRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.menuTitle, { color: theme.foreground }]}>
              Chugli Mobile v1.0.0
            </Text>
            <Text style={[styles.menuSubtitle, { color: theme.mutedText }]}>
              Fetch latest features & bugfixes
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.updateBtn, { backgroundColor: theme.accent }]}
            onPress={handleCheckUpdate}
            disabled={updatingApp}
          >
            {updatingApp ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.updateBtnText}>Update</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <LogOut size={18} color="#ef4444" style={{ marginRight: 8 }} />
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>

      {/* Danger Zone */}
      <View style={[styles.card, { borderColor: '#ef4444', backgroundColor: theme.card }]}>
        <Text style={styles.dangerTitle}>Danger Zone</Text>
        <TouchableOpacity
          style={styles.deleteAccountBtn}
          onPress={() => setIsDeleteModalOpen(true)}
        >
          <Trash2 size={18} color="#ef4444" style={{ marginRight: 10 }} />
          <Text style={styles.deleteAccountText}>Delete Account</Text>
        </TouchableOpacity>
      </View>

      {/* Password Modal */}
      <UIModal
        visible={isPassModalOpen}
        onClose={() => setIsPassModalOpen(false)}
        title="Change Password"
        subtitle="Update your account security credentials"
        icon={<Key size={20} color={theme.accent} />}
        position="center"
      >
        {passError ? <Text style={styles.errorText}>{passError}</Text> : null}

        <TextInput
          style={[styles.modalInput, { backgroundColor: theme.input, borderColor: theme.border, color: theme.foreground }]}
          placeholder="Current Password"
          placeholderTextColor={theme.mutedText}
          secureTextEntry
          value={oldPassword}
          onChangeText={setOldPassword}
        />
        <TextInput
          style={[styles.modalInput, { backgroundColor: theme.input, borderColor: theme.border, color: theme.foreground }]}
          placeholder="New Password"
          placeholderTextColor={theme.mutedText}
          secureTextEntry
          value={newPassword}
          onChangeText={setNewPassword}
        />
        <TextInput
          style={[styles.modalInput, { backgroundColor: theme.input, borderColor: theme.border, color: theme.foreground }]}
          placeholder="Confirm New Password"
          placeholderTextColor={theme.mutedText}
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />

        <View style={styles.modalActions}>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => setIsPassModalOpen(false)}
          >
            <Text style={{ color: theme.mutedText, fontWeight: '600' }}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.confirmBtn, { backgroundColor: theme.accent }]}
            onPress={handleChangePassword}
            disabled={changingPass}
          >
            {changingPass ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.confirmText}>Update Password</Text>
            )}
          </TouchableOpacity>
        </View>
      </UIModal>

      {/* PIN Modal */}
      <UIModal
        visible={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
        title="Configure App Lock PIN"
        subtitle="Enter 4-digit security PIN to lock Chugli"
        icon={<ShieldCheck size={20} color={theme.accent} />}
        position="center"
      >
        <TextInput
          style={[styles.pinInput, { backgroundColor: theme.input, borderColor: theme.border, color: theme.foreground }]}
          placeholder="••••"
          placeholderTextColor={theme.mutedText}
          keyboardType="number-pad"
          maxLength={4}
          secureTextEntry
          value={pin}
          onChangeText={setPin}
        />

        <View style={styles.modalActions}>
          <TouchableOpacity style={styles.cancelBtn} onPress={handleDisablePin}>
            <Text style={{ color: '#ef4444', fontWeight: '600' }}>Disable PIN</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => setIsPinModalOpen(false)}
          >
            <Text style={{ color: theme.mutedText, fontWeight: '600' }}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.confirmBtn, { backgroundColor: theme.accent }]}
            onPress={handleSavePin}
          >
            <Text style={styles.confirmText}>Save PIN</Text>
          </TouchableOpacity>
        </View>
      </UIModal>

      {/* Delete Account Modal */}
      <UIModal
        visible={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Account"
        subtitle="This action is permanent. Type DELETE to confirm:"
        icon={<Trash2 size={20} color="#ef4444" />}
        position="center"
      >
        <TextInput
          style={[styles.modalInput, { backgroundColor: theme.input, borderColor: '#ef4444', color: theme.foreground }]}
          placeholder='Type "DELETE"'
          placeholderTextColor={theme.mutedText}
          value={deleteConfirmText}
          onChangeText={setDeleteConfirmText}
        />

        <View style={styles.modalActions}>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => setIsDeleteModalOpen(false)}
          >
            <Text style={{ color: theme.mutedText, fontWeight: '600' }}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.confirmBtn,
              {
                backgroundColor:
                  deleteConfirmText === 'DELETE' ? '#ef4444' : theme.border,
              },
            ]}
            onPress={handleDeleteAccount}
            disabled={deleteConfirmText !== 'DELETE' || deleting}
          >
            {deleting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.confirmText}>Delete Account</Text>
            )}
          </TouchableOpacity>
        </View>
      </UIModal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 16,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
  },
  avatarFallback: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
  },
  profileDetails: {
    marginLeft: 14,
    flex: 1,
  },
  username: {
    fontSize: 18,
    fontWeight: '800',
  },
  email: {
    fontSize: 13,
    marginTop: 2,
  },
  aboutContainer: {
    marginTop: 4,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  successMsg: {
    color: '#22c55e',
    fontSize: 12,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    fontSize: 14,
  },
  saveButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  subLabel: {
    fontSize: 12,
    marginBottom: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  menuItemLast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
  },
  menuIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuInfo: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  menuSubtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  themeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  themeBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  themeBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  updateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  updateBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  updateBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 15,
    fontWeight: '700',
  },
  dangerTitle: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 10,
  },
  deleteAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteAccountText: {
    color: '#ef4444',
    fontWeight: '700',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    marginBottom: 14,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginBottom: 10,
  },
  modalInput: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginBottom: 12,
    fontSize: 14,
  },
  pinInput: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 20,
    textAlign: 'center',
    letterSpacing: 8,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  confirmBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  confirmText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
});
