import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
} from 'lucide-react-native';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  message: string;
  type?: ToastType;
  duration?: number;
}

type ToastListener = (toast: ToastItem) => void;
const listeners: Set<ToastListener> = new Set();

let toastCounter = 0;

export function showToast(
  message: string,
  type: ToastType = 'info',
  duration = 3500
) {
  const id = `toast-${Date.now()}-${++toastCounter}`;
  const toastItem: ToastItem = { id, message, type, duration };
  listeners.forEach((listener) => listener(toastItem));
}

export default function ToastContainer() {
  const [toastList, setToastList] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handleNewToast = (newToast: ToastItem) => {
      setToastList((prev) => [...prev, newToast]);

      setTimeout(() => {
        setToastList((prev) => prev.filter((t) => t.id !== newToast.id));
      }, newToast.duration || 3500);
    };

    listeners.add(handleNewToast);
    return () => {
      listeners.delete(handleNewToast);
    };
  }, []);

  const removeToast = (id: string) => {
    setToastList((prev) => prev.filter((t) => t.id !== id));
  };

  if (toastList.length === 0) return null;

  return (
    <View style={styles.container} pointerEvents="box-none">
      {toastList.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </View>
  );
}

function ToastCard({ toast, onClose }: { toast: ToastItem; onClose: () => void }) {
  const translateY = React.useRef(new Animated.Value(-60)).current;
  const opacity = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const getThemeStyles = () => {
    switch (toast.type) {
      case 'success':
        return {
          bgColor: '#064e3b',
          borderColor: '#10b981',
          textColor: '#a7f3d0',
          icon: <CheckCircle2 size={20} color="#34d399" />,
        };
      case 'error':
        return {
          bgColor: '#4c0519',
          borderColor: '#f43f5e',
          textColor: '#fecdd3',
          icon: <AlertCircle size={20} color="#fb7185" />,
        };
      case 'warning':
        return {
          bgColor: '#451a03',
          borderColor: '#f59e0b',
          textColor: '#fef3c7',
          icon: <AlertTriangle size={20} color="#fbbf24" />,
        };
      case 'info':
      default:
        return {
          bgColor: '#0f172a',
          borderColor: '#38bdf8',
          textColor: '#e0f2fe',
          icon: <Info size={20} color="#38bdf8" />,
        };
    }
  };

  const config = getThemeStyles();

  return (
    <Animated.View
      style={[
        styles.toastCard,
        {
          backgroundColor: config.bgColor,
          borderColor: config.borderColor,
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={styles.iconContainer}>{config.icon}</View>
      <Text style={[styles.toastText, { color: config.textColor }]}>
        {toast.message}
      </Text>
      <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
        <X size={16} color={config.textColor} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    zIndex: 999999,
    alignItems: 'center',
    gap: 8,
  },
  toastCard: {
    width: '100%',
    maxWidth: 400,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 10,
  },
  iconContainer: {
    marginRight: 10,
  },
  toastText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },
  closeBtn: {
    padding: 4,
    marginLeft: 8,
  },
});
