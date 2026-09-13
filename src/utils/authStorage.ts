import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const TOKEN_KEY = 'chatAppToken';
const USER_ID_KEY = 'chatAppUserId';
const APP_LOCK_PIN_KEY = 'appLockPin';
const ACTIVE_WORKSPACE_KEY = 'activeWorkspace';

export async function getToken(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      return AsyncStorage.getItem(TOKEN_KEY);
    }
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch (error) {
    console.error('Error fetching auth token:', error);
    return null;
  }
}

export async function setToken(token: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(TOKEN_KEY, token);
      return;
    }
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch (error) {
    console.error('Error saving auth token:', error);
  }
}

export async function removeToken(): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      await AsyncStorage.removeItem(TOKEN_KEY);
      return;
    }
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch (error) {
    console.error('Error removing auth token:', error);
  }
}

export async function getUserId(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      return AsyncStorage.getItem(USER_ID_KEY);
    }
    return await SecureStore.getItemAsync(USER_ID_KEY);
  } catch (error) {
    return null;
  }
}

export async function setUserId(userId: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(USER_ID_KEY, userId);
      return;
    }
    await SecureStore.setItemAsync(USER_ID_KEY, userId);
  } catch (error) {
    console.error('Error saving user ID:', error);
  }
}

export async function getLockPin(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      return AsyncStorage.getItem(APP_LOCK_PIN_KEY);
    }
    return await SecureStore.getItemAsync(APP_LOCK_PIN_KEY);
  } catch (error) {
    return null;
  }
}

export async function setLockPin(pin: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(APP_LOCK_PIN_KEY, pin);
      return;
    }
    await SecureStore.setItemAsync(APP_LOCK_PIN_KEY, pin);
  } catch (error) {
    console.error('Error saving lock PIN:', error);
  }
}

export async function removeLockPin(): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      await AsyncStorage.removeItem(APP_LOCK_PIN_KEY);
      return;
    }
    await SecureStore.deleteItemAsync(APP_LOCK_PIN_KEY);
  } catch (error) {
    console.error('Error removing lock PIN:', error);
  }
}

export async function getActiveWorkspace(): Promise<'chat' | 'together'> {
  try {
    const val = await AsyncStorage.getItem(ACTIVE_WORKSPACE_KEY);
    return val === 'together' ? 'together' : 'chat';
  } catch {
    return 'chat';
  }
}

export async function setActiveWorkspace(workspace: 'chat' | 'together'): Promise<void> {
  try {
    await AsyncStorage.setItem(ACTIVE_WORKSPACE_KEY, workspace);
  } catch (error) {
    console.error('Error saving workspace:', error);
  }
}
