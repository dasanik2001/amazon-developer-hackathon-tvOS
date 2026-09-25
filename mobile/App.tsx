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
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: '#1A0A35',
          borderTopColor: 'rgba(255, 255, 255, 0.08)',
          borderTopWidth: 1,
          paddingTop: 6,
          paddingBottom: 8,
          height: 65,
        },
        tabBarActiveTintColor: '#FA2E67',
        tabBarInactiveTintColor: 'rgba(255, 255, 255, 0.35)',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        headerStyle: {
          backgroundColor: '#1A0A35',
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: 'rgba(255, 255, 255, 0.08)',
        },
        headerTintColor: '#FFFFFF',
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
        <ActivityIndicator size="large" color="#FA2E67" style={{ marginTop: 20 }} />
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
    backgroundColor: '#1A0A35',
  },
  loadingLogo: {
    fontSize: 72,
    marginBottom: 16,
  },
  loadingTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
