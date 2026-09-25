import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { Colors, FontSizes, Shadows } from './src/theme/colors';

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
          backgroundColor: '#FFFFFF',
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          paddingTop: 6,
          paddingBottom: 8,
          height: 65,
          ...Shadows.raised,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        headerStyle: {
          backgroundColor: '#FFFFFF',
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: Colors.border,
        },
        headerTintColor: Colors.textPrimary,
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 18,
          color: Colors.textPrimary,
        },
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
      <View style={styles.loadingScreen}>
        <View style={styles.loadingMark}>
          <Ionicons name="shield-checkmark" size={40} color={Colors.primary} />
        </View>
        <Text style={styles.loadingTitle}>Family TV Guardian</Text>
        <ActivityIndicator size="small" color={Colors.primary} style={{ marginTop: 20 }} />
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
  },
  loadingMark: {
    width: 84,
    height: 84,
    borderRadius: 24,
    backgroundColor: Colors.tintBlue,
    borderWidth: 1.5,
    borderColor: Colors.tintBlueStrong,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  loadingTitle: {
    fontSize: FontSizes.title,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: 0.3,
  },
});
