import Constants from 'expo-constants';
import { Platform } from 'react-native';

const getHostIpFromConstants = (): string | null => {
  try {
    // 1. expoConfig.hostUri (Expo SDK 49+)
    const hostUri = Constants.expoConfig?.hostUri;
    if (hostUri && typeof hostUri === 'string') {
      const ip = hostUri.split(':')[0];
      if (ip && ip !== 'localhost' && ip !== '127.0.0.1') return ip;
    }

    // 2. manifest2 (Expo Go SDK 49+)
    const manifest2 = (Constants as any).manifest2;
    const debuggerHost2 = manifest2?.extra?.expoGo?.debuggerHost;
    if (debuggerHost2 && typeof debuggerHost2 === 'string') {
      const ip = debuggerHost2.split(':')[0];
      if (ip && ip !== 'localhost' && ip !== '127.0.0.1') return ip;
    }

    // 3. manifest (Legacy Expo Go)
    const manifest = (Constants as any).manifest;
    const debuggerHost = manifest?.debuggerHost;
    if (debuggerHost && typeof debuggerHost === 'string') {
      const ip = debuggerHost.split(':')[0];
      if (ip && ip !== 'localhost' && ip !== '127.0.0.1') return ip;
    }

    // 4. linkingUri or experienceUrl (e.g. exp://10.18.178.181:8081)
    const expUrl = (Constants as any).linkingUri || (Constants as any).experienceUrl;
    if (expUrl && typeof expUrl === 'string') {
      const match = expUrl.match(/:\/\/([^:/]+)/);
      if (match && match[1] && match[1] !== 'localhost' && match[1] !== '127.0.0.1') {
        return match[1];
      }
    }
  } catch {}

  return null;
};

const isRemoteUrl = (url?: string): boolean => {
  if (!url) return false;
  if (url.startsWith('https://')) return true;
  const isLanOrLocal =
    url.includes('localhost') ||
    url.includes('127.0.0.1') ||
    url.includes('10.0.2.2') ||
    /https?:\/\/(10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)/.test(url);
  return !isLanOrLocal;
};

let loggedUrl: string | null = null;

export const getApiUrl = (): string => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;

  // 1. If explicit environment variable is a remote/production URL (e.g. deployed backend), use it
  if (envUrl && isRemoteUrl(envUrl)) {
    const cleanUrl = envUrl.replace(/\/$/, '');
    if (__DEV__ && loggedUrl !== cleanUrl) {
      loggedUrl = cleanUrl;
      console.log('[API URL] Using remote backend:', cleanUrl);
    }
    return cleanUrl;
  }

  // 2. In local development on physical device, get host IP dynamically from Expo dev server (Metro)
  // This automatically tracks Wi-Fi IP changes on the host PC without needing to edit .env
  const dynamicHostIp = getHostIpFromConstants();
  if (dynamicHostIp) {
    const url = `http://${dynamicHostIp}:5001`;
    if (__DEV__ && loggedUrl !== url) {
      loggedUrl = url;
      console.log('[API URL] Using dynamic Metro host IP:', url);
    }
    return url;
  }

  // 3. If explicit local environment variable is set and no dynamic host could be resolved
  if (envUrl) {
    const cleanUrl = envUrl.replace(/\/$/, '');
    if (__DEV__ && loggedUrl !== cleanUrl) {
      loggedUrl = cleanUrl;
      console.log('[API URL] Using EXPO_PUBLIC_API_URL:', cleanUrl);
    }
    return cleanUrl;
  }

  // 4. Android Emulator host loopback address
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5001';
  }

  // 5. iOS Simulator / Web default
  return 'http://localhost:5001';
};
