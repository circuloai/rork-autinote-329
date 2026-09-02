import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { LogBox, View, ActivityIndicator, StyleSheet, Text, Platform } from "react-native";
import { AppProvider } from "@/contexts/AppContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { useFonts } from "expo-font";

import {
  PlayfairDisplay_700Bold,
  PlayfairDisplay_700Bold_Italic,
} from "@expo-google-fonts/playfair-display";
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from "@expo-google-fonts/dm-sans";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { requestNotificationPermissions } from "@/lib/notifications";

try {
  if (Platform.OS !== 'web' && typeof ErrorUtils !== 'undefined') {
    const originalHandler = ErrorUtils.getGlobalHandler();
    ErrorUtils.setGlobalHandler((error: any, isFatal: any) => {
      console.error('Global error handler:', error, 'isFatal:', isFatal);
      if (originalHandler) {
        originalHandler(error, isFatal);
      }
    });
  }
} catch (e) {
  console.warn('Could not set global error handler:', e);
}

try {
  void SplashScreen.preventAutoHideAsync();
} catch (error) {
  console.error('Error preventing splash screen auto hide:', error);
}

LogBox.ignoreLogs([
  'source.uri',
  'Failed prop type',
  'Warning:',
]);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      networkMode: 'offlineFirst',
    },
    mutations: {
      retry: false,
    },
  },
});

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="explore" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(therapist)" options={{ headerShown: false }} />
      <Stack.Screen name="therapist/client/[childId]" options={{ headerShown: false }} />
      <Stack.Screen name="therapist/note/[childId]" options={{ headerShown: false, presentation: 'modal' }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="modal" options={{ headerShown: false, presentation: 'modal' }} />
      <Stack.Screen name="therapist-chat" options={{ headerShown: false }} />
      <Stack.Screen name="log/daily" options={{ headerShown: false, presentation: 'modal' }} />
      <Stack.Screen name="log/meltdown" options={{ headerShown: false, presentation: 'modal' }} />
      <Stack.Screen name="calendar" options={{ headerShown: false }} />
      <Stack.Screen name="profile" options={{ headerShown: false }} />
      <Stack.Screen name="settings/shared-access" options={{ headerShown: false, title: 'Shared Access' }} />
      <Stack.Screen name="settings/invite-therapist" options={{ headerShown: false, title: 'Invite Therapist' }} />
      <Stack.Screen name="settings/manage-permissions" options={{ headerShown: false, title: 'Manage Permissions' }} />
      <Stack.Screen name="settings/diagnose-connection" options={{ headerShown: false, title: 'Diagnose Connection' }} />
      <Stack.Screen name="settings/reminders" options={{ headerShown: false, title: 'Reminders' }} />
      <Stack.Screen name="settings/customization" options={{ headerShown: true, title: 'Customization' }} />
      <Stack.Screen name="settings/profile" options={{ headerShown: false, title: 'My Profile' }} />
      <Stack.Screen name="settings/forgot-password" options={{ headerShown: false, title: 'Reset Password' }} />
      <Stack.Screen name="settings/progress-settings" options={{ headerShown: false, title: 'Progress Settings' }} />
      <Stack.Screen name="settings/data-privacy" options={{ headerShown: false, title: 'Data & Privacy' }} />
      <Stack.Screen name="settings/autumn-settings" options={{ headerShown: false, title: 'Customize Autumn' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [hasError, setHasError] = useState(false);

  const [fontsLoaded, fontError] = useFonts({
    PlayfairDisplay_700Bold,
    PlayfairDisplay_700Bold_Italic,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
  });

  useEffect(() => {
    async function prepare() {
      try {
        console.log("[init] platform:", Platform.OS);
        await new Promise((resolve) => setTimeout(resolve, 150));
        setAppIsReady(true);
      } catch (e) {
        console.error("Error during app initialization:", e);
        setHasError(true);
        setAppIsReady(true);
      } finally {
        try {
          await SplashScreen.hideAsync();
        } catch (error) {
          console.error("Error hiding splash screen:", error);
        }
      }
    }

    if (fontsLoaded || fontError) {
      if (fontError) {
        console.warn("[init] Custom fonts failed to load; continuing with system fonts", fontError);
      }
      const prepared = async () => {
        await prepare();
        void requestNotificationPermissions();
      };
      void prepared();
    }
  }, [fontsLoaded, fontError]);

  if (!appIsReady && !fontError) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#261D15" />
      </View>
    );
  }

  if (hasError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to initialize app</Text>
        <Text style={styles.errorSubtext}>Please restart the app</Text>
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AppProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <RootLayoutNav />
            </GestureHandlerRootView>
          </AppProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F6F5F3',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F6F5F3',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#B85C4A',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#8C7A6B',
  },
});
