import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { getApiUrl } from '../utils/apiUrl';
import { getSocket } from '../hooks/useSocket';

export interface FeatureFlag {
  name: string;
  enabled: boolean;
  platform?: 'all' | 'web' | 'mobile';
  description?: string;
  message?: string;
}

export interface MobileThemeTokenSet {
  id?: string;
  name?: string;
  background?: string;
  foreground?: string;
  primary?: string;
  secondary?: string;
  accent?: string;
  muted?: string;
  mutedText?: string;
  card?: string;
  border?: string;
  input?: string;
  bubbleSent?: string;
  bubbleSentText?: string;
  bubbleReceived?: string;
  bubbleReceivedText?: string;
  [key: string]: any;
}

export interface MobileThemesConfig {
  activeDefault?: string;
  themes?: {
    light?: MobileThemeTokenSet;
    dark?: MobileThemeTokenSet;
    aurora?: MobileThemeTokenSet;
    [key: string]: any;
  };
}

export interface MobileAppConfig {
  minSupportedVersion?: string;
  latestVersion?: string;
  forceUpdateEnabled?: boolean;
  maintenanceMode?: boolean;
  maintenanceMessage?: string;
  appLockPolicy?: {
    enforced?: boolean;
    minPinLength?: number;
    allowedTimeouts?: string[];
    allowBiometrics?: boolean;
  };
}

export interface PublicMobileSystemConfig {
  features?: Record<string, FeatureFlag>;
  themes?: MobileThemesConfig;
  animated_bg?: Record<string, any>;
  together_games?: Record<string, any>;
  couple_activities?: Record<string, any>;
  mobile_app?: MobileAppConfig;
}

interface ConfigContextValue {
  config: PublicMobileSystemConfig | null;
  loading: boolean;
  isFeatureEnabled: (key: string) => boolean;
  isGameEnabled: (gameId: string) => boolean;
  isActivityEnabled: (activityId: string) => boolean;
  maintenance: { enabled: boolean; message: string };
  refreshConfig: () => Promise<void>;
}

const ConfigContext = createContext<ConfigContextValue>({
  config: null,
  loading: false,
  isFeatureEnabled: () => true,
  isGameEnabled: () => true,
  isActivityEnabled: () => true,
  maintenance: { enabled: false, message: '' },
  refreshConfig: async () => {},
});

export const ConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<PublicMobileSystemConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchConfig = async () => {
    try {
      const baseUrl = getApiUrl();
      const res = await fetch(`${baseUrl}/api/config/public`, {
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.config) {
          setConfig(json.config);
        }
      }
    } catch (e) {
      console.warn('Failed to fetch public config on mobile:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();

    // Attach realtime socket listeners
    const checkSocketInterval = setInterval(() => {
      const socket = getSocket();
      if (socket) {
        clearInterval(checkSocketInterval);

        socket.on('admin:config_updated', (payload: { category: string; data: any }) => {
          setConfig((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              [payload.category]: payload.data,
            };
          });
        });

        socket.on('features:updated', (featuresData: any) => {
          setConfig((prev) => (prev ? { ...prev, features: featuresData } : prev));
        });

        socket.on('theme:updated', (themeData: any) => {
          setConfig((prev) => (prev ? { ...prev, themes: themeData } : prev));
        });

        socket.on('animated_bg:updated', (bgData: any) => {
          setConfig((prev) => (prev ? { ...prev, animated_bg: bgData } : prev));
        });

        socket.on('mobile_app:updated', (appData: any) => {
          setConfig((prev) => (prev ? { ...prev, mobile_app: appData } : prev));
        });

        socket.on('together_games:updated', (gamesData: any) => {
          setConfig((prev) => (prev ? { ...prev, together_games: gamesData } : prev));
        });

        socket.on('couple_activities:updated', (actData: any) => {
          setConfig((prev) => (prev ? { ...prev, couple_activities: actData } : prev));
        });
      }
    }, 1500);

    return () => clearInterval(checkSocketInterval);
  }, []);

  const isFeatureEnabled = (key: string): boolean => {
    if (!config?.features) return true;
    const feat = config.features[key];
    if (!feat) return true;
    // If flagged for web only, disable on mobile
    if (feat.platform === 'web') return false;
    return feat.enabled !== false;
  };

  const isGameEnabled = (gameId: string): boolean => {
    if (!config?.together_games) return true;
    const game = config.together_games[gameId];
    if (!game) return true;
    return game.enabled !== false;
  };

  const isActivityEnabled = (activityId: string): boolean => {
    if (!config?.couple_activities) return true;
    const act = config.couple_activities[activityId];
    if (!act) return true;
    return act.enabled !== false;
  };

  const maintenance = useMemo(() => {
    const isMaintenance =
      config?.features?.maintenance_mode?.enabled === true ||
      config?.mobile_app?.maintenanceMode === true;
    const message =
      config?.mobile_app?.maintenanceMessage ||
      config?.features?.maintenance_mode?.message ||
      'Chugli is currently undergoing scheduled maintenance. Please check back shortly.';
    return { enabled: isMaintenance, message };
  }, [config]);

  const value: ConfigContextValue = {
    config,
    loading,
    isFeatureEnabled,
    isGameEnabled,
    isActivityEnabled,
    maintenance,
    refreshConfig: fetchConfig,
  };

  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
};

export const useSystemConfig = () => useContext(ConfigContext);
