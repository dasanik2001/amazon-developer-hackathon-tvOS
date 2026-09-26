import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { Colors, FontSizes, Shadows } from './src/theme/colors';
import BrandEmblem from './src/components/BrandEmblem';

// Auth Screens
import LoginScreen from './src/screens/auth/LoginScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';
import ForgotPasswordScreen from './src/screens/auth/ForgotPasswordScreen';

// Main Screens
import DashboardScreen from './src/screens/main/DashboardScreen';
import GuardianAiScreen from './src/screens/main/GuardianAiScreen';
import ControlsScreen from './src/screens/main/ControlsScreen';
import ProfileScreen from './src/screens/main/ProfileScreen';

const Tab = createBottomTabNavigator();

// ─── Auth Flow Navigator (No OTP Screen) ────────────────────────────────

function AuthNavigator() {
  const [screen, setScreen] = useState<'login' | 'register' | 'forgot'>('login');

  switch (screen) {
    case 'login':
      return (
        <LoginScreen
          onNavigateRegister={() => setScreen('register')}
          onNavigateForgot={() => setScreen('forgot')}
        />
      );
    case 'register':
      return (
        <RegisterScreen
          onNavigateLogin={() => setScreen('login')}
        />
      );
    case 'forgot':
      return (
        <ForgotPasswordScreen
          onBack={() => setScreen('login')}
        />
      );
    default:
      return null;
  }
}

// ─── Main App Navigator (Authenticated) ─────────────────────────────────

function MainNavigator() {
  const insets = useSafeAreaInsets();
  // Keep the bar clear of the Android gesture bar / iPhone home indicator.
  const bottomInset = Math.max(insets.bottom, 8);

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          paddingTop: 6,
          paddingBottom: bottomInset,
          height: 58 + bottomInset,
          ...Shadows.raised,
        },
        tabBarItemStyle: { paddingVertical: 4 },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          letterSpacing: 0.1,
        },
        headerStyle: {
          backgroundColor: '#FFFFFF',
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: Colors.border,
        },
        headerShadowVisible: false,
        headerTitleAlign: 'left',
        headerTintColor: Colors.textPrimary,
        headerTitleStyle: {
          fontWeight: '800',
          fontSize: 19,
          color: Colors.textPrimary,
          letterSpacing: -0.2,
        },
        headerTitleContainerStyle: { marginLeft: 16, marginRight: 16 },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => <Ionicons name="grid" size={size ?? 22} color={color} />,
          tabBarLabel: 'Dashboard',
        }}
      />
      <Tab.Screen
        name="GuardianAI"
        component={GuardianAiScreen}
        options={{
          title: 'Guardian AI',
          tabBarIcon: ({ color, size }) => <Ionicons name="sparkles" size={size ?? 22} color={color} />,
          tabBarLabel: 'Ask AI',
        }}
      />
      <Tab.Screen
        name="Controls"
        component={ControlsScreen}
        options={{
          title: 'Controls & TV Link',
          tabBarIcon: ({ color, size }) => <Ionicons name="options" size={size ?? 22} color={color} />,
          tabBarLabel: 'Controls',
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size ?? 22} color={color} />,
          tabBarLabel: 'Profile',
        }}
      />
    </Tab.Navigator>
  );
}

// ─── Root App Component ──────────────────────────────────────────────────

function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View
        style={styles.loadingScreen}
        accessibilityRole="progressbar"
        accessibilityLabel="Family TV Guardian is starting"
      >
        <BrandEmblem size={88} />
        <Text style={styles.loadingTitle}>Family TV Guardian</Text>
        <Text style={styles.loadingSubtitle}>Preparing your household…</Text>
        <ActivityIndicator size="small" color={Colors.primary} style={{ marginTop: 18 }} />
      </View>
    );
  }

  return (
    <NavigationContainer
      theme={{
        ...DefaultTheme,
        colors: { ...DefaultTheme.colors, background: Colors.bgDark },
      }}
    >
      {isAuthenticated ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.bgDark,
    gap: 4,
  },
  loadingTitle: {
    fontSize: FontSizes.title,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: 0.3,
    marginTop: 18,
  },
  loadingSubtitle: {
    fontSize: FontSizes.body,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
