import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Session, User, AuthError } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

const LOCAL_FALLBACK_KEYS = [
  '@autinote_user_profile',
  '@autinote_log_entries',
  '@autinote_preferences',
  '@autinote_chat_history',
] as const;

async function clearLocalFallbackData() {
  await Promise.all(LOCAL_FALLBACK_KEYS.map((key) => AsyncStorage.removeItem(key)));
}

export const [AuthProvider, useAuth] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let subscription: any = null;
    let mounted = true;

    const initAuth = async () => {
      try {
        console.log('[Auth] Getting session...');
        const { data, error } = await supabase.auth.getSession();
        if (!mounted) return;
        if (error) {
          console.error('[Auth] getSession error:', error.message);
        }
        setSession(data?.session ?? null);
        setUser(data?.session?.user ?? null);
        console.log('[Auth] Session loaded:', !!data?.session);
      } catch (error: any) {
        console.error('[Auth] Session fetch failed:', error?.message || error);
        if (!mounted) return;
        setSession(null);
        setUser(null);
      } finally {
        if (mounted) setIsLoading(false);
      }

      try {
        const { data } = supabase.auth.onAuthStateChange((event, newSession) => {
          if (!mounted) return;
          console.log('[Auth] State change:', event, newSession?.user?.id);
          setSession(newSession);
          setUser(newSession?.user ?? null);
          setIsLoading(false);
          
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            void queryClient.invalidateQueries();
          } else if (event === 'SIGNED_OUT') {
            queryClient.clear();
          }
        });
        subscription = data.subscription;
      } catch (error: any) {
        console.error('[Auth] onAuthStateChange error:', error?.message || error);
      }
    };

    void initAuth();

    return () => {
      mounted = false;
      if (subscription) {
        try {
          subscription.unsubscribe();
        } catch (error) {
          console.error('[Auth] Unsubscribe error:', error);
        }
      }
    };
  }, [queryClient]);

  const signUp = useCallback(async (email: string, password: string): Promise<{ error: AuthError | null; user: User | null; session: Session | null; needsEmailConfirmation: boolean }> => {
    try {
      console.log('[Auth] Attempting sign up for:', email);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      const needsEmailConfirmation = !error && !!data.user && !data.session;
      console.log('[Auth] SignUp result - user:', data.user?.id, 'session:', !!data.session, 'needsConfirmation:', needsEmailConfirmation);

      // Supabase normally emits SIGNED_IN, but setting the returned session
      // here also covers the short window where onboarding can navigate before
      // the auth listener callback runs.
      if (data.session) {
        setSession(data.session);
        setUser(data.user ?? data.session.user);
        setIsLoading(false);
        void queryClient.invalidateQueries();
      }
      
      return { 
        error, 
        user: data.user ?? null, 
        session: data.session ?? null,
        needsEmailConfirmation 
      };
    } catch (err) {
      console.error('[Auth] SignUp network/unexpected error:', err);
      const message = err instanceof Error ? err.message : 'Network request failed';
      return {
        error: { message: `Connection error: ${message}. Please check your internet connection and try again.`, name: 'AuthError', status: 0 } as AuthError,
        user: null,
        session: null,
        needsEmailConfirmation: false,
      };
    }
  }, [queryClient]);

  const signIn = useCallback(async (email: string, password: string): Promise<{ error: AuthError | null; user: User | null; session: Session | null }> => {
    try {
      console.log('[Auth] Signing in...');
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      const responseData = data as { session: Session | null; user: User | null };
      if (error) {
        console.error('[Auth] Sign in error:', error.message);
      } else {
        const nextSession = responseData.session ?? null;
        const nextUser = responseData.user ?? nextSession?.user ?? null;
        console.log('[Auth] Sign in result:', {
          hasSession: !!nextSession,
          hasUser: !!nextUser,
          sessionExpiresAt: nextSession?.expires_at ?? null,
        });

        // Do not rely only on onAuthStateChange here. If sign-in completes
        // while the initial auth listener is being registered, that event can
        // be missed even though Supabase returned and persisted a valid session.
        if (nextSession) {
          setSession(nextSession);
          setUser(nextUser);
          setIsLoading(false);
          void queryClient.invalidateQueries();
        }
      }
      return {
        error,
        user: responseData.user ?? responseData.session?.user ?? null,
        session: responseData.session ?? null,
      };
    } catch (err) {
      console.error('[Auth] SignIn network/unexpected error:', err);
      const message = err instanceof Error ? err.message : 'Network request failed';
      return {
        error: { message: `Connection error: ${message}. Please check your internet connection and try again.`, name: 'AuthError', status: 0 } as AuthError,
        user: null,
        session: null,
      };
    }
  }, [queryClient]);

  const signOut = useCallback(async (): Promise<{ error: AuthError | null }> => {
    try {
      console.log('[Auth] Signing out...');
      const { error } = await supabase.auth.signOut();
      if (!error) {
        console.log('[Auth] Sign out successful');
        await clearLocalFallbackData();
        queryClient.clear();
        setSession(null);
        setUser(null);
      }
      return { error };
    } catch (err) {
      console.error('[Auth] SignOut error:', err);
      await clearLocalFallbackData();
      queryClient.clear();
      setSession(null);
      setUser(null);
      return { error: null };
    }
  }, [queryClient]);

  const resetPassword = useCallback(async (email: string): Promise<{ error: AuthError | null }> => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      return { error };
    } catch (err) {
      console.error('[Auth] Reset password error:', err);
      const message = err instanceof Error ? err.message : 'Network request failed';
      return {
        error: { message: `Connection error: ${message}`, name: 'AuthError', status: 0 } as AuthError,
      };
    }
  }, []);

  const signInWithOAuth = useCallback(async (provider: 'google' | 'apple'): Promise<{ error: Error | null }> => {
    try {
      console.log(`[Auth] Starting ${provider} OAuth...`);
      
      const redirectUrl = Platform.OS === 'web'
        ? window.location.origin
        : Linking.createURL('/');
      console.log('[Auth] Redirect URL:', redirectUrl);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        console.error(`[Auth] ${provider} OAuth error:`, error);
        return { error };
      }

      if (!data?.url) {
        return { error: new Error(`Could not get ${provider} login URL. Please check that ${provider} OAuth is configured in your Supabase project.`) };
      }

      if (Platform.OS === 'web') {
        const authWindow = window.open(data.url, '_blank', 'width=500,height=700,menubar=no,toolbar=no');
        
        if (!authWindow) {
          window.location.href = data.url;
          return { error: null };
        }

        return new Promise<{ error: Error | null }>((resolve) => {
          const checkInterval = setInterval(() => {
            try {
              if (authWindow.closed) {
                clearInterval(checkInterval);
                void supabase.auth.getSession().then(({ data: sessionData }) => {
                  if (sessionData.session) {
                    console.log('[Auth] OAuth session detected after popup closed');
                    resolve({ error: null });
                  } else {
                    resolve({ error: new Error('Authentication was cancelled') });
                  }
                });
                return;
              }

              const popupUrl = authWindow.location?.href;
              if (popupUrl && popupUrl.startsWith(redirectUrl)) {
                clearInterval(checkInterval);
                
                const url = new URL(popupUrl);
                const hashParams = new URLSearchParams(url.hash.substring(1));
                const accessToken = hashParams.get('access_token');
                const refreshToken = hashParams.get('refresh_token');
                
                authWindow.close();

                if (accessToken && refreshToken) {
                  void supabase.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken,
                  }).then(({ error: sessionError }) => {
                    if (sessionError) {
                      console.error('[Auth] Session set error:', sessionError);
                      resolve({ error: sessionError });
                    } else {
                      console.log('[Auth] OAuth session set successfully');
                      resolve({ error: null });
                    }
                  });
                } else {
                  resolve({ error: new Error('No tokens received from authentication') });
                }
              }
            } catch {
              // Cross-origin access error is expected while on the OAuth provider's page
            }
          }, 500);

          setTimeout(() => {
            clearInterval(checkInterval);
            if (!authWindow.closed) {
              authWindow.close();
            }
            resolve({ error: new Error('Authentication timed out') });
          }, 120000);
        });
      } else {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
        console.log('[Auth] WebBrowser result:', result.type);

        if (result.type === 'success' && result.url) {
          const url = new URL(result.url);
          const params = new URLSearchParams(url.hash.substring(1));
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');

          if (accessToken && refreshToken) {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (sessionError) {
              console.error('[Auth] Session set error:', sessionError);
              return { error: sessionError };
            }
          }
        } else if (result.type === 'cancel' || result.type === 'dismiss') {
          return { error: new Error('Authentication was cancelled') };
        }

        return { error: null };
      }
    } catch (err) {
      console.error(`[Auth] ${provider} OAuth unexpected error:`, err);
      return { error: err instanceof Error ? err : new Error('An unexpected error occurred') };
    }
  }, []);

  return useMemo(() => ({
    session,
    user,
    isLoading,
    isAuthenticated: !!session,
    signUp,
    signIn,
    signOut,
    resetPassword,
    signInWithOAuth,
  }), [session, user, isLoading, signUp, signIn, signOut, resetPassword, signInWithOAuth]);
});
