import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { Colors } from './src/theme/colors';

// Auth Screens
import LoginScreen from './src/screens/auth/LoginScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';
import OtpVerificationScreen from './src/screens/auth/OtpVerificationScreen';
import ForgotPasswordScreen from './src/screens/auth/ForgotPasswordScreen';

// Main Screens
import DashboardScreen from './src/screens/main/DashboardScreen';
import GuardianAiScreen from './src/screens/main/GuardianAiScreen';
import ControlsScreen from './src/screens/main/ControlsScreen';
import ProfileScreen from './src/screens/main/ProfileScreen';

const Tab = createBottomTabNavigator();

// ─── Auth Flow Navigator ────────────────────────────────────────────────

function AuthNavigator() {
  const [screen, setScreen] = useState<'login' | 'register' | 'otp' | 'forgot'>('login');
  const [otpData, setOtpData] = useState<{ challengeId: string; otpHint?: string; identifier?: string }>({
    challengeId: '',
  });

  const handleNavigateOtp = (challengeId: string, otpHint?: string, identifier?: string) => {
    setOtpData({ challengeId, otpHint, identifier });
    setScreen('otp');
  };

  switch (screen) {
    case 'login':
      return (
        <LoginScreen
          onNavigateRegister={() => setScreen('register')}
          onNavigateForgot={() => setScreen('forgot')}
          onNavigateOtp={handleNavigateOtp}
        />
      );
    case 'register':
      return (
        <RegisterScreen
          onNavigateLogin={() => setScreen('login')}
          onNavigateOtp={handleNavigateOtp}
        />
      );
    case 'otp':
      return (
        <OtpVerificationScreen
          challengeId={otpData.challengeId}
          otpHint={otpData.otpHint}
          identifier={otpData.identifier}
          onVerified={() => {}}  // Auth context will auto-detect authenticated state
          onBack={() => setScreen('login')}
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
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: Colors.bgCard,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          paddingTop: 6,
          paddingBottom: 8,
          height: 65,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        headerStyle: {
          backgroundColor: Colors.bgDark,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: Colors.border,
        },
        headerTintColor: Colors.textPrimary,
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 18,
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: '🛡️ Dashboard',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>📊</Text>,
          tabBarLabel: 'Dashboard',
        }}
      />
      <Tab.Screen
        name="GuardianAI"
        component={GuardianAiScreen}
        options={{
          title: '💬 Guardian AI',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>💡</Text>,
          tabBarLabel: 'Ask AI',
        }}
      />
      <Tab.Screen
        name="Controls"
        component={ControlsScreen}
        options={{
          title: '⚙️ Controls & TV Link',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>🎮</Text>,
          tabBarLabel: 'Controls',
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: '👤 Profile',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>👤</Text>,
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
      <View style={styles.loadingScreen}>
        <Text style={styles.loadingLogo}>🛡️</Text>
        <Text style={styles.loadingTitle}>Family TV Guardian</Text>
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 20 }} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" />
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
  },
  loadingLogo: {
    fontSize: 72,
    marginBottom: 16,
  },
  loadingTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
});
