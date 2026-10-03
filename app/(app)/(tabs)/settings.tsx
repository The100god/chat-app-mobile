import React, { useState, useEffect } from 'react';
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
  Platform,
} from 'react-native';
import { useAuth } from '../../../src/context/AuthContext';
import { useTheme } from '../../../src/context/ThemeContext';
import { apiFetch } from '../../../src/utils/apiFetch';
import { getApiUrl } from '../../../src/utils/apiUrl';
import {
  getLockPin,
  setLockPin,
  removeLockPin,
  getLockTimeout,
  setLockTimeout,
  setAnimatedBgConfig,
} from '../../../src/utils/authStorage';
import { useAtom } from 'jotai';
import { animatedBgEnabledAtom, animatedBgTextAtom, animatedBgTextColorAtom } from '../../../src/states/States';
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
  Eye,
  EyeOff,
  Palette,
} from 'lucide-react-native';
import { AnimatedEmojiBackground } from '../../../src/components/AnimatedEmojiBackground';

const LOCK_TIMEOUT_OPTIONS = [
  { label: 'Immediately', value: -1 },
  { label: '10s', value: 10 },
  { label: '30s', value: 30 },
  { label: '5 min', value: 300 },
  { label: '30 min', value: 1800 },
];

const PRESET_HEX_LIST = ['#ffffff', '#f472b6', '#38bdf8', '#c084fc', '#fbbf24', '#34d399', '#f87171'];

const PALETTE_COLORS = [
  '#FFFFFF', '#E5E7EB', '#9CA3AF', '#374151',
  '#F87171', '#EF4444', '#DC2626', '#B91C1C',
  '#FB923C', '#F97316', '#EA580C', '#C2410C',
  '#FBBF24', '#F59E0B', '#D97706', '#FACC15',
  '#34D399', '#10B981', '#059669', '#047857',
  '#38BDF8', '#0EA5E9', '#0284C7', '#0369A1',
  '#818CF8', '#6366F1', '#4F46E5', '#4338CA',
  '#C084FC', '#A855F7', '#9333EA', '#7E22CE',
  '#F472B6', '#EC4899', '#DB2777', '#BE185D',
];

function isLightColor(hex: string): boolean {
  if (!hex || !hex.startsWith('#')) return false;
  const c = hex.substring(1);
  const rgb = parseInt(c.length === 3 ? c.split('').map((x) => x + x).join('') : c, 16);
  if (isNaN(rgb)) return false;
  const r = (rgb >> 16) & 0xff;
  const g = (rgb >> 8) & 0xff;
  const b = (rgb >> 0) & 0xff;
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luma > 160;
}

export default function SettingsTab() {
  const { user, logout, refreshUserData } = useAuth();
  const { mode, theme, setTheme } = useTheme();

  const [about, setAbout] = useState(user.about || "Hey there! I'm using Chugli.");
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');

  // Notifications Toggle
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // Animated Background Settings
  const [animatedBgEnabled, setAnimatedBgEnabled] = useAtom(animatedBgEnabledAtom);
  const [animatedBgText, setAnimatedBgText] = useAtom(animatedBgTextAtom);
  const [animatedBgTextColor, setAnimatedBgTextColor] = useAtom(animatedBgTextColorAtom);
  const [bgDraftText, setBgDraftText] = useState(animatedBgText || '');
  const [bgDraftTextColor, setBgDraftTextColor] = useState(animatedBgTextColor || '');
  const [isColorModalOpen, setIsColorModalOpen] = useState(false);
  const [customHexInput, setCustomHexInput] = useState('');

  useEffect(() => {
    setBgDraftText(animatedBgText || '');
  }, [animatedBgText]);

  useEffect(() => {
    setBgDraftTextColor(animatedBgTextColor || '');
  }, [animatedBgTextColor]);

  const handleToggleAnimatedBg = (val: boolean) => {
    setAnimatedBgEnabled(val);
    setAnimatedBgConfig(val, animatedBgText, animatedBgTextColor);
    showToast(val ? 'Animated background enabled' : 'Animated background disabled', 'info');
  };

  const handleSaveBgText = () => {
    setAnimatedBgText(bgDraftText);
    setAnimatedBgTextColor(bgDraftTextColor);
    setAnimatedBgConfig(animatedBgEnabled, bgDraftText, bgDraftTextColor);
    showToast('Background changes saved successfully!', 'success');
  };

  const handleResetBgText = () => {
    setBgDraftText('');
    setAnimatedBgText('');
    setBgDraftTextColor('');
    setAnimatedBgTextColor('');
    setAnimatedBgConfig(animatedBgEnabled, '', '');
    showToast('Reset to default emojis!', 'info');
  };

  const handleSelectPreset = (emojis: string, defaultColor?: string) => {
    setBgDraftText(emojis);
    setAnimatedBgText(emojis);
    const newColor = defaultColor !== undefined ? defaultColor : bgDraftTextColor;
    if (defaultColor !== undefined) {
      setBgDraftTextColor(defaultColor);
      setAnimatedBgTextColor(defaultColor);
    }
    setAnimatedBgConfig(animatedBgEnabled, emojis, newColor);
    showToast('Preset theme applied!', 'info');
  };

  // Password Modal
  const [isPassModalOpen, setIsPassModalOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [changingPass, setChangingPass] = useState(false);
  const [passError, setPassError] = useState('');

  // PIN Modal
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [hasPin, setHasPin] = useState(false);
  const [lockTimeout, setLockTimeoutState] = useState<number>(-1);
  const [selectedTimeout, setSelectedTimeout] = useState<number>(-1);

  useEffect(() => {
    (async () => {
      const stored = await getLockPin();
      setHasPin(!!stored);
      const timeout = await getLockTimeout();
      setLockTimeoutState(timeout);
      setSelectedTimeout(timeout === 0 ? -1 : timeout);
    })();
  }, []);

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
      await setLockTimeout(selectedTimeout);
      setLockTimeoutState(selectedTimeout);
      setHasPin(true);
      showToast('PIN lock configured successfully!', 'success');
      setIsPinModalOpen(false);
      setPin('');
    } catch (err) {
      console.error('Save PIN error:', err);
    }
  };

  const handleDisablePin = async () => {
    await removeLockPin();
    setHasPin(false);
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
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <AnimatedEmojiBackground />
      <ScrollView
        style={styles.container}
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
              {hasPin
                ? `Enabled • ${
                    LOCK_TIMEOUT_OPTIONS.find((o) => o.value === lockTimeout)?.label ||
                    'Immediately'
                  }`
                : '4-digit PIN security lock'}
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

        {/* Animated Background Toggle & Custom Emojis */}
        <View style={[styles.prefDivider, { backgroundColor: theme.border }]} />

        <View style={styles.bgToggleRow}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
              <Sparkles size={16} color="#ec4899" style={{ marginRight: 6 }} />
              <Text style={[styles.menuTitle, { color: theme.foreground }]}>
                Animated Background
              </Text>
            </View>
            <Text style={[styles.menuSubtitle, { color: theme.mutedText }]}>
              Floating faint emoji animations
            </Text>
          </View>
          <Switch
            value={animatedBgEnabled}
            onValueChange={handleToggleAnimatedBg}
            trackColor={{ false: theme.border, true: theme.accent }}
            thumbColor="#ffffff"
          />
        </View>

        {animatedBgEnabled && (
          <View style={{ marginTop: 12 }}>
            <Text style={[styles.inputLabel, { color: theme.mutedText, marginBottom: 6 }]}>
              Custom Emojis or Text:
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <TextInput
                style={[
                  styles.bgTextInput,
                  {
                    backgroundColor: theme.input,
                    borderColor: theme.border,
                    color: theme.foreground,
                  },
                ]}
                value={bgDraftText}
                onChangeText={setBgDraftText}
                placeholder="e.g. 🌸 💖 ✨ 🔥 or words"
                placeholderTextColor={theme.mutedText}
              />
              <TouchableOpacity
                style={[styles.saveBgBtn, { backgroundColor: theme.accent }]}
                onPress={handleSaveBgText}
                activeOpacity={0.7}
              >
                <Check size={14} color="#ffffff" style={{ marginRight: 4 }} />
                <Text style={styles.saveBgBtnText}>Save</Text>
              </TouchableOpacity>
              {(bgDraftText || animatedBgText) ? (
                <TouchableOpacity
                  style={[styles.resetBgBtn, { backgroundColor: theme.muted, borderColor: theme.border }]}
                  onPress={handleResetBgText}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.resetBgBtnText, { color: theme.foreground }]}>Reset</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Text Color Swatches */}
            <Text style={[styles.presetHeader, { color: theme.mutedText, marginTop: 12 }]}>
              Text Color: {bgDraftTextColor ? bgDraftTextColor.toUpperCase() : 'Auto'}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetScroll}>
              <TouchableOpacity
                style={[
                  styles.colorChip,
                  {
                    backgroundColor: !bgDraftTextColor ? `${theme.accent}20` : theme.muted,
                    borderColor: !bgDraftTextColor ? theme.accent : theme.border,
                  },
                ]}
                onPress={() => setBgDraftTextColor('')}
                activeOpacity={0.7}
              >
                <Text style={[styles.colorChipText, { color: !bgDraftTextColor ? theme.accent : theme.foreground }]}>
                  Auto
                </Text>
              </TouchableOpacity>

              {[
                { name: 'White', hex: '#ffffff' },
                { name: 'Pink', hex: '#f472b6' },
                { name: 'Cyan', hex: '#38bdf8' },
                { name: 'Purple', hex: '#c084fc' },
                { name: 'Gold', hex: '#fbbf24' },
                { name: 'Mint', hex: '#34d399' },
                { name: 'Coral', hex: '#f87171' },
              ].map((c) => {
                const isSel = bgDraftTextColor.toLowerCase() === c.hex.toLowerCase();
                return (
                  <TouchableOpacity
                    key={c.hex}
                    style={[
                      styles.colorDot,
                      { backgroundColor: c.hex },
                      isSel && { borderColor: theme.foreground, borderWidth: 2.5, transform: [{ scale: 1.1 }] },
                    ]}
                    onPress={() => setBgDraftTextColor(c.hex)}
                    activeOpacity={0.7}
                  >
                    {isSel && (
                      <Check size={12} color={c.hex === '#ffffff' || c.hex === '#fbbf24' ? '#111827' : '#ffffff'} />
                    )}
                  </TouchableOpacity>
                );
              })}

              {/* Custom Color Picker Button */}
              {(() => {
                const isCustom = bgDraftTextColor && !PRESET_HEX_LIST.includes(bgDraftTextColor.toLowerCase());
                return (
                  <TouchableOpacity
                    style={[
                      styles.colorDot,
                      styles.customColorDot,
                      {
                        backgroundColor: isCustom ? bgDraftTextColor : theme.muted,
                        borderColor: isCustom ? theme.foreground : theme.accent,
                      },
                    ]}
                    onPress={() => {
                      setCustomHexInput(bgDraftTextColor || '#EC4899');
                      setIsColorModalOpen(true);
                    }}
                    activeOpacity={0.7}
                  >
                    {isCustom ? (
                      <Check size={12} color={isLightColor(bgDraftTextColor) ? '#111827' : '#FFFFFF'} />
                    ) : (
                      <Palette size={13} color={theme.accent} />
                    )}
                  </TouchableOpacity>
                );
              })()}
            </ScrollView>

            {/* Quick Preset Chips */}
            <Text style={[styles.presetHeader, { color: theme.mutedText }]}>
              Quick Presets:
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetScroll}>
              {[
                { label: '💕 Romance', emojis: '🌸 💖 💕 ❤️ 🥰 💌', color: '#f472b6' },
                { label: '✨ Magic', emojis: '✨ 💫 🌟 🔮 🦋 🌙', color: '#c084fc' },
                { label: '🔥 Energy', emojis: '🔥 ⚡ 🚀 💥 🎈 🎉', color: '#fbbf24' },
                { label: '🌸 Spring', emojis: '🌸 🌷 🌺 🌹 🌿 🍃', color: '#34d399' },
                { label: '🧸 Cute', emojis: '🧸 🐱 🐶 🐼 🍓 🍭', color: '#ffffff' },
              ].map((p) => {
                const isSelected = (bgDraftText || animatedBgText) === p.emojis;
                return (
                  <TouchableOpacity
                    key={p.label}
                    style={[
                      styles.presetChip,
                      {
                        backgroundColor: isSelected ? `${theme.accent}20` : theme.muted,
                        borderColor: isSelected ? theme.accent : theme.border,
                      },
                    ]}
                    onPress={() => handleSelectPreset(p.emojis, p.color)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.presetChipText,
                        { color: isSelected ? theme.accent : theme.foreground },
                        isSelected && { fontWeight: '700' },
                      ]}
                    >
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}
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

        <View style={[styles.passInputWrapper, { backgroundColor: theme.input, borderColor: theme.border }]}>
          <TextInput
            style={[styles.passInput, { color: theme.foreground }]}
            placeholder="Current Password"
            placeholderTextColor={theme.mutedText}
            secureTextEntry={!showOldPass}
            value={oldPassword}
            onChangeText={setOldPassword}
          />
          <TouchableOpacity onPress={() => setShowOldPass((p) => !p)} style={styles.eyeBtn}>
            {showOldPass ? (
              <EyeOff size={18} color={theme.mutedText} />
            ) : (
              <Eye size={18} color={theme.mutedText} />
            )}
          </TouchableOpacity>
        </View>

        <View style={[styles.passInputWrapper, { backgroundColor: theme.input, borderColor: theme.border }]}>
          <TextInput
            style={[styles.passInput, { color: theme.foreground }]}
            placeholder="New Password"
            placeholderTextColor={theme.mutedText}
            secureTextEntry={!showNewPass}
            value={newPassword}
            onChangeText={setNewPassword}
          />
          <TouchableOpacity onPress={() => setShowNewPass((p) => !p)} style={styles.eyeBtn}>
            {showNewPass ? (
              <EyeOff size={18} color={theme.mutedText} />
            ) : (
              <Eye size={18} color={theme.mutedText} />
            )}
          </TouchableOpacity>
        </View>

        <View style={[styles.passInputWrapper, { backgroundColor: theme.input, borderColor: theme.border }]}>
          <TextInput
            style={[styles.passInput, { color: theme.foreground }]}
            placeholder="Confirm New Password"
            placeholderTextColor={theme.mutedText}
            secureTextEntry={!showConfirmPass}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
          <TouchableOpacity onPress={() => setShowConfirmPass((p) => !p)} style={styles.eyeBtn}>
            {showConfirmPass ? (
              <EyeOff size={18} color={theme.mutedText} />
            ) : (
              <Eye size={18} color={theme.mutedText} />
            )}
          </TouchableOpacity>
        </View>

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
        title={hasPin ? "Configure App Lock PIN" : "Set App Lock PIN"}
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

        <Text style={[styles.inputLabel, { color: theme.mutedText, marginBottom: 8 }]}>
          Auto-Lock Timeout:
        </Text>
        <View style={styles.timeoutRow}>
          {LOCK_TIMEOUT_OPTIONS.map((opt) => {
            const isSel = selectedTimeout === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.timeoutPill,
                  {
                    backgroundColor: isSel ? theme.accent : theme.muted,
                    borderColor: isSel ? theme.accent : theme.border,
                  },
                ]}
                onPress={() => setSelectedTimeout(opt.value)}
              >
                <Text
                  style={[
                    styles.timeoutPillText,
                    { color: isSel ? '#ffffff' : theme.foreground },
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.modalActions}>
          {hasPin ? (
            <TouchableOpacity style={styles.cancelBtn} onPress={handleDisablePin}>
              <Text style={{ color: '#ef4444', fontWeight: '600' }}>Disable PIN</Text>
            </TouchableOpacity>
          ) : null}
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

      {/* Custom Color Picker Modal */}
      <UIModal
        visible={isColorModalOpen}
        onClose={() => setIsColorModalOpen(false)}
        title="Custom Text Color"
        subtitle="Choose a shade or type a 6-digit hex code"
        icon={<Palette size={20} color={theme.accent} />}
        position="center"
      >
        {/* Live Preview Box */}
        {(() => {
          const previewHex =
            customHexInput.startsWith('#') &&
            (customHexInput.length === 4 || customHexInput.length === 7)
              ? customHexInput
              : '#FFFFFF';
          return (
            <View style={[styles.colorPreviewBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <Text style={{ fontSize: 11, color: theme.mutedText, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Preview on {mode === 'dark' ? 'Dark' : 'Light'} theme:
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 8 }}>
                <Text style={{ fontSize: 22 }}>🌸 💖</Text>
                <Text style={{ fontSize: 20, fontWeight: '700', color: previewHex }}>
                  {bgDraftText.trim() ? bgDraftText.slice(0, 14) : 'Sample Text'}
                </Text>
              </View>
              <View style={[styles.hexPill, { backgroundColor: theme.muted }]}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: theme.foreground, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>
                  {previewHex.toUpperCase()}
                </Text>
              </View>
            </View>
          );
        })()}

        {/* HEX Input */}
        <Text style={[styles.inputLabel, { color: theme.mutedText, marginTop: 12, marginBottom: 6 }]}>
          HEX Color Code:
        </Text>
        <View style={[styles.hexInputWrapper, { backgroundColor: theme.input, borderColor: theme.border }]}>
          <Text style={[styles.hashSymbol, { color: theme.mutedText }]}>#</Text>
          <TextInput
            style={[styles.hexTextInput, { color: theme.foreground }]}
            value={customHexInput.replace('#', '')}
            onChangeText={(txt) => {
              const cleaned = txt.replace(/[^0-9A-Fa-f]/g, '').slice(0, 6);
              setCustomHexInput(cleaned ? '#' + cleaned.toUpperCase() : '');
            }}
            placeholder="EC4899"
            placeholderTextColor={theme.mutedText}
            autoCapitalize="characters"
            maxLength={6}
          />
          <View
            style={[
              styles.hexPreviewDot,
              {
                backgroundColor:
                  customHexInput.startsWith('#') && (customHexInput.length === 4 || customHexInput.length === 7)
                    ? customHexInput
                    : '#FFFFFF',
              },
            ]}
          />
        </View>

        {/* Quick Color Palette Grid */}
        <Text style={[styles.inputLabel, { color: theme.mutedText, marginTop: 14, marginBottom: 8 }]}>
          Palette Colors:
        </Text>
        <View style={styles.colorPaletteGrid}>
          {PALETTE_COLORS.map((hex) => {
            const isSel = customHexInput.toUpperCase() === hex.toUpperCase();
            return (
              <TouchableOpacity
                key={hex}
                style={[
                  styles.gridColorDot,
                  { backgroundColor: hex },
                  isSel && { borderColor: theme.foreground, borderWidth: 2.5, transform: [{ scale: 1.15 }] },
                ]}
                onPress={() => setCustomHexInput(hex)}
                activeOpacity={0.7}
              >
                {isSel && (
                  <Check size={11} color={isLightColor(hex) ? '#111827' : '#FFFFFF'} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Modal Actions */}
        <View style={styles.modalActions}>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => setIsColorModalOpen(false)}
          >
            <Text style={{ color: theme.mutedText, fontWeight: '600' }}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.confirmBtn, { backgroundColor: theme.accent }]}
            onPress={() => {
              let finalColor = customHexInput.trim();
              if (!finalColor.startsWith('#')) finalColor = '#' + finalColor;
              if (finalColor.length !== 4 && finalColor.length !== 7) {
                finalColor = '#FFFFFF';
              }
              setBgDraftTextColor(finalColor);
              setIsColorModalOpen(false);
              showToast(`Color ${finalColor} selected!`, 'info');
            }}
          >
            <Text style={{ color: '#ffffff', fontWeight: '700' }}>Apply Color</Text>
          </TouchableOpacity>
        </View>
      </UIModal>
      </ScrollView>
    </View>
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
  passInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 46,
    marginBottom: 10,
  },
  passInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
  },
  eyeBtn: {
    padding: 6,
  },
  timeoutRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  timeoutPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  timeoutPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  prefDivider: {
    height: 1,
    marginVertical: 14,
  },
  bgToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bgTextInput: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  saveBgBtn: {
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  saveBgBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  resetBgBtn: {
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resetBgBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  presetHeader: {
    fontSize: 11,
    marginTop: 10,
    marginBottom: 6,
    fontWeight: '600',
  },
  presetScroll: {
    gap: 6,
    paddingVertical: 2,
  },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  colorDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 3,
  },
  colorChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  colorChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  customColorDot: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  colorPreviewBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  hexPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  hexInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  hashSymbol: {
    fontSize: 16,
    fontWeight: '700',
    marginRight: 4,
  },
  hexTextInput: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 1,
  },
  hexPreviewDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  colorPaletteGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 4,
  },
  gridColorDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
