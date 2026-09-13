import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { X, AlertTriangle, Trash2, LogOut, CheckCircle } from 'lucide-react-native';

export interface UIModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: number;
  position?: 'center' | 'bottom';
}

export const UIModal: React.FC<UIModalProps> = ({
  visible,
  onClose,
  title,
  subtitle,
  icon,
  children,
  maxWidth = 420,
  position = 'center',
}) => {
  const { theme } = useTheme();

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType={position === 'bottom' ? 'slide' : 'fade'} transparent>
      <TouchableWithoutFeedback onPress={onClose}>
        <View
          style={[
            styles.backdrop,
            position === 'bottom' ? styles.backdropBottom : styles.backdropCenter,
          ]}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={position === 'bottom' ? { width: '100%' } : { width: '92%', maxWidth }}
          >
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View
                style={[
                  position === 'bottom' ? styles.bottomCard : styles.centerCard,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                  },
                ]}
              >
                {position === 'bottom' && <View style={[styles.dragHandle, { backgroundColor: theme.border }]} />}

                {(title || icon) && (
                  <View style={styles.headerRow}>
                    <View style={styles.headerLeft}>
                      {icon && <View style={styles.iconWrap}>{icon}</View>}
                      <View style={{ flex: 1 }}>
                        {title && (
                          <Text style={[styles.headerTitle, { color: theme.foreground }]}>
                            {title}
                          </Text>
                        )}
                        {subtitle && (
                          <Text style={[styles.headerSubtitle, { color: theme.mutedText }]}>
                            {subtitle}
                          </Text>
                        )}
                      </View>
                    </View>
                    <TouchableOpacity
                      style={[styles.closeBtn, { backgroundColor: theme.muted }]}
                      onPress={onClose}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <X size={16} color={theme.mutedText} />
                    </TouchableOpacity>
                  </View>
                )}

                <View style={styles.contentWrap}>{children}</View>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export interface UIConfirmDialogProps {
  visible: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  iconType?: 'logout' | 'delete' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

export const UIConfirmDialog: React.FC<UIConfirmDialogProps> = ({
  visible,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  iconType = 'warning',
  onConfirm,
  onCancel,
}) => {
  const { theme } = useTheme();

  if (!visible) return null;

  const renderIcon = () => {
    switch (iconType) {
      case 'logout':
        return <LogOut size={22} color="#ef4444" />;
      case 'delete':
        return <Trash2 size={22} color="#ef4444" />;
      case 'info':
        return <CheckCircle size={22} color={theme.accent} />;
      default:
        return <AlertTriangle size={22} color={variant === 'danger' ? '#ef4444' : '#f59e0b'} />;
    }
  };

  const getConfirmBg = () => {
    if (variant === 'danger') return '#ef4444';
    if (variant === 'warning') return '#f59e0b';
    return theme.accent;
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View
              style={[
                styles.confirmCard,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                },
              ]}
            >
              <View
                style={[
                  styles.confirmIconCircle,
                  {
                    backgroundColor:
                      variant === 'danger'
                        ? 'rgba(239, 68, 68, 0.15)'
                        : `${theme.accent}20`,
                  },
                ]}
              >
                {renderIcon()}
              </View>

              <Text style={[styles.confirmTitle, { color: theme.foreground }]}>
                {title}
              </Text>

              <Text style={[styles.confirmDesc, { color: theme.mutedText }]}>
                {description}
              </Text>

              <View style={styles.confirmButtonsRow}>
                <TouchableOpacity
                  style={[
                    styles.cancelBtn,
                    { backgroundColor: theme.muted, borderColor: theme.border },
                  ]}
                  onPress={onCancel}
                >
                  <Text style={[styles.cancelBtnText, { color: theme.foreground }]}>
                    {cancelText}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.confirmBtn, { backgroundColor: getConfirmBg() }]}
                  onPress={onConfirm}
                >
                  <Text style={styles.confirmBtnText}>{confirmText}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdropCenter: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  backdropBottom: {
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  centerCard: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
  },
  bottomCard: {
    width: '100%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    padding: 22,
    maxHeight: '88%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  iconWrap: {
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentWrap: {
    width: '100%',
  },
  confirmCard: {
    width: '90%',
    maxWidth: 360,
    borderRadius: 24,
    borderWidth: 1,
    padding: 22,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 14,
  },
  confirmIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  confirmTitle: {
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  confirmDesc: {
    fontSize: 12.5,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  confirmButtonsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
});
