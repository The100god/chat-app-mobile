import React from 'react';
import { Tabs } from 'expo-router';
import { MessageSquare, Users, Gamepad2, UserPlus, Settings } from 'lucide-react-native';
import { useAtom } from 'jotai';
import { friendUnreadTotalAtom, groupUnreadTotalAtom, friendRequestsCountAtom } from '../../../src/states/States';
import { useTheme } from '../../../src/context/ThemeContext';

export default function TabsLayout() {
  const [friendUnreadTotal] = useAtom(friendUnreadTotalAtom);
  const [groupUnreadTotal] = useAtom(groupUnreadTotalAtom);
  const [friendRequestsCount] = useAtom(friendRequestsCountAtom);
  const { theme } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.card,
          borderTopColor: theme.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.mutedText,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Chats',
          tabBarBadge: friendUnreadTotal > 0 ? friendUnreadTotal : undefined,
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <MessageSquare size={size || 22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{
          title: 'Groups',
          tabBarBadge: groupUnreadTotal > 0 ? groupUnreadTotal : undefined,
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Users size={size || 22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="together"
        options={{
          title: 'Together',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Gamepad2 size={size || 22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: 'Friends',
          tabBarBadge: friendRequestsCount > 0 ? friendRequestsCount : undefined,
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <UserPlus size={size || 22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Settings size={size || 22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

