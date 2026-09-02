import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useMemo, useCallback } from 'react';
import type { UserProfile, LogEntry, Preferences, SharedAccess, TherapistNote, DailyLogEntry, MeltdownLogEntry, AnyLogEntry, ChatMessage } from '@/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { getChatHistoryStorageKey } from '@/lib/chatHistory';
import { useAuth } from './AuthContext';

const STORAGE_KEYS = {
  USER_PROFILE: '@autinote_user_profile',
  LOG_ENTRIES: '@autinote_log_entries',
  PREFERENCES: '@autinote_preferences',
  CHAT_HISTORY: '@autinote_chat_history',
};



export const [AppProvider, useApp] = createContextHook(() => {
  const queryClient = useQueryClient();
  const { user, isAuthenticated: authIsAuthenticated } = useAuth();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  const profileQuery = useQuery({
    queryKey: ['userProfile', user?.id],
    queryFn: async () => {
      console.log('[AppContext] Fetching profile for user:', user?.id);
      try {
        if (!user || !isSupabaseConfigured) {
          console.log('[AppContext] No user or Supabase not configured, using AsyncStorage');
          const stored = await AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILE);
          return stored ? JSON.parse(stored) as UserProfile : null;
        }

        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error || !profile) {
          console.log('[AppContext] Profile fetch error:', error);
          return null;
        }

        console.log('[AppContext] Profile fetched:', profile.id, 'activeChildId:', profile.active_child_id);

        const authEmail = (user.email || profile.caregiver_email || '').toLowerCase().trim();
        console.log('[AppContext] Self-repair: linking any invites addressed to', authEmail);
        let linkedCount = 0;
        const { data: rpcLinked, error: rpcErr } = await supabase.rpc('accept_therapist_invites');
        if (rpcErr) {
          console.warn('[AppContext] accept_therapist_invites RPC error:', rpcErr.message, rpcErr);
        } else {
          linkedCount = (rpcLinked as number) ?? 0;
          console.log('[AppContext] Linked', linkedCount, 'invites for', authEmail);
        }

        const { data: linkedRows } = await supabase
          .from('shared_access')
          .select('id')
          .eq('therapist_id', profile.id)
          .eq('status', 'accepted')
          .limit(1);
        const hasTherapistRows = (linkedRows?.length ?? 0) > 0;

        if (hasTherapistRows && profile.role !== 'therapist') {
          console.log('[AppContext] Auto-promoting profile to therapist role');
          const { error: roleErr } = await supabase
            .from('profiles')
            .update({ role: 'therapist' })
            .eq('id', profile.id);
          if (roleErr) {
            console.warn('[AppContext] Failed to set therapist role:', roleErr.message);
          } else {
            profile.role = 'therapist';
          }
        }

        if (profile.role === 'therapist' && authEmail && !profile.caregiver_email) {
          await supabase
            .from('profiles')
            .update({ caregiver_email: authEmail })
            .eq('id', profile.id);
          profile.caregiver_email = authEmail;
        }

        const { data: children } = await supabase
          .from('children')
          .select('*')
          .eq('profile_id', profile.id);

        const mappedChildren = (children || []).map((c: any) => ({
          id: c.id,
          name: c.name,
          age: c.age,
          diagnosis: c.diagnosis || undefined,
          gradeLevel: c.grade_level || undefined,
          schoolName: c.school_name || undefined,
          height: c.height || undefined,
          weight: c.weight || undefined,
          commonTriggers: c.common_triggers || [],
          strengths: c.strengths || undefined,
          interests: c.interests || undefined,
          avatar: c.avatar || undefined,
          createdAt: c.created_at,
        }));

        console.log('[AppContext] Children loaded:', mappedChildren.length, mappedChildren.map((c: any) => c.id));

        let resolvedActiveChildId = profile.active_child_id || null;
        if (mappedChildren.length > 0) {
          const activeExists = resolvedActiveChildId && mappedChildren.some((c: any) => c.id === resolvedActiveChildId);
          if (!activeExists) {
            console.log('[AppContext] activeChildId invalid, auto-setting to first child:', mappedChildren[0].id);
            resolvedActiveChildId = mappedChildren[0].id;
            supabase.from('profiles')
              .update({ active_child_id: resolvedActiveChildId })
              .eq('id', profile.id)
              .then(({ error: updateErr }) => {
                if (updateErr) console.error('[AppContext] Failed to auto-set activeChildId:', updateErr);
                else console.log('[AppContext] Auto-set activeChildId to:', resolvedActiveChildId);
              });
          }
        }

        return {
          id: profile.id,
          role: profile.role as any,
          caregiverName: profile.caregiver_name || undefined,
          caregiverEmail: profile.caregiver_email || undefined,
          caregiverPhone: profile.caregiver_phone || undefined,
          therapistPhone: profile.therapist_phone || undefined,
          avatar: profile.avatar || undefined,
          children: mappedChildren,
          activeChildId: resolvedActiveChildId,
          createdAt: profile.created_at,
          isExploreMode: profile.is_explore_mode || false,
        };
      } catch (error) {
        console.error('[AppContext] Profile query error:', error);
        return null;
      }
    },
    staleTime: 0,
    retry: isSupabaseConfigured && !!user ? 2 : false,
  });

  const therapistClientsQuery = useQuery({
    queryKey: ['therapistClients', user?.id, profileQuery.data?.id, profileQuery.data?.role],
    queryFn: async () => {
      if (!user || !profileQuery.data?.id || profileQuery.data?.role !== 'therapist') {
        return [];
      }

      const { data: accessRows, error: accessErr } = await supabase
        .from('shared_access')
        .select('*')
        .eq('therapist_id', profileQuery.data.id)
        .eq('status', 'accepted');

      if (accessErr) {
        console.log('[AppContext] therapist clients access fetch error:', accessErr);
        return [];
      }

      if (!accessRows || accessRows.length === 0) return [];

      const childIds = accessRows.map((sa: any) => sa.child_id);
      const parentIds = Array.from(new Set(accessRows.map((sa: any) => sa.parent_id)));

      const [childrenRes, parentsRes] = await Promise.all([
        supabase.from('children').select('*').in('id', childIds),
        supabase.from('profiles').select('id, caregiver_name, caregiver_email').in('id', parentIds),
      ]);

      const childrenById = new Map<string, any>();
      (childrenRes.data || []).forEach((c: any) => childrenById.set(c.id, c));
      const parentsById = new Map<string, any>();
      (parentsRes.data || []).forEach((p: any) => parentsById.set(p.id, p));

      return accessRows
        .filter((sa: any) => childrenById.has(sa.child_id))
        .map((sa: any) => {
          const c = childrenById.get(sa.child_id);
          const p = parentsById.get(sa.parent_id);
          return {
            sharedAccessId: sa.id as string,
            parentId: sa.parent_id as string,
            parentName: (p?.caregiver_name as string) || 'Caregiver',
            parentEmail: (p?.caregiver_email as string) || '',
            permissions: {
              canViewLogs: !!sa.can_view_logs,
              canViewProgress: !!sa.can_view_progress,
              canViewProfile: !!sa.can_view_profile,
              canAddNotes: !!sa.can_add_notes,
              canAddSessions: !!sa.can_add_sessions,
              canComment: !!sa.can_comment,
              canExport: !!sa.can_export,
              readonlyMode: !!sa.readonly_mode,
            },
            child: {
              id: c.id as string,
              name: c.name as string,
              age: c.age as number,
              diagnosis: c.diagnosis || undefined,
              gradeLevel: c.grade_level || undefined,
              schoolName: c.school_name || undefined,
              height: c.height || undefined,
              weight: c.weight || undefined,
              commonTriggers: c.common_triggers || [],
              strengths: c.strengths || undefined,
              interests: c.interests || undefined,
              avatar: c.avatar || undefined,
              createdAt: c.created_at,
            },
          };
        });
    },
    enabled: !!user && !!profileQuery.data?.id && profileQuery.data?.role === 'therapist' && isSupabaseConfigured,
    retry: isSupabaseConfigured ? 2 : false,
  });

  const therapistClientChildIds = useMemo<string[]>(() => {
    return (therapistClientsQuery.data || []).map((tc: any) => tc.child.id);
  }, [therapistClientsQuery.data]);

  const therapistClientChildIdsKey = useMemo(() => {
    return [...therapistClientChildIds].sort().join(',');
  }, [therapistClientChildIds]);

  const logsQuery = useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: ['logEntries', user?.id, profileQuery.data?.children?.length, profileQuery.data?.role, therapistClientChildIdsKey],
    queryFn: async () => {
      try {
        if (!user || !isSupabaseConfigured || !profileQuery.data) {
          const stored = await AsyncStorage.getItem(STORAGE_KEYS.LOG_ENTRIES);
          return stored ? JSON.parse(stored) as LogEntry[] : [];
        }

        const ownIds = (profileQuery.data.children || []).map(c => c.id);
        const childIds = profileQuery.data.role === 'therapist'
          ? therapistClientChildIds
          : ownIds;
        if (childIds.length === 0) return [];

        const { data, error } = await supabase
          .from('log_entries')
          .select('*')
          .in('child_id', childIds);

        if (error) {
          console.log('Logs fetch error:', error);
          return [];
        }

        return (data || []).map((log: any) => {
          const baseLog = {
            id: log.id,
            childId: log.child_id,
            date: log.date,
            moodRating: log.mood_rating as any,
            positiveNotes: log.positive_notes || undefined,
            challengeNotes: log.challenge_notes || undefined,
            moodTags: log.mood_tags || [],
            type: log.type as any,
            behaviors: log.behaviors || undefined,
            sleepHours: log.sleep_hours || undefined,
            triggers: log.triggers || undefined,
            voiceNotes: log.voice_notes || undefined,
            photos: log.photos || undefined,
            createdAt: log.created_at,
          };

          if (log.type === 'daily') {
            return {
              ...baseLog,
              overallRating: log.mood_rating,
              whatWentWell: log.positive_notes || undefined,
              whatWasChallenging: log.challenge_notes || undefined,
              photo: log.photos?.[0] || undefined,
            } as DailyLogEntry;
          } else if (log.type === 'meltdown') {
            const behaviors = log.behaviors || [];
            const severity = behaviors.find((b: string) => ['mild', 'moderate', 'severe'].includes(b)) || 'moderate';
            const durationMatch = behaviors.find((b: string) => b.includes('min'));
            const durationMinutes = durationMatch ? parseInt(durationMatch) : 0;
            
            return {
              ...baseLog,
              moodAtEvent: log.mood_rating,
              severity,
              durationMinutes,
              additionalNotes: log.challenge_notes || undefined,
              photo: log.photos?.[0] || undefined,
            } as MeltdownLogEntry;
          }

          return baseLog as LogEntry;
        });
      } catch (error) {
        console.error('Logs query error:', error);
        return [];
      }
    },
    enabled: !!profileQuery.data,
    retry: isSupabaseConfigured && !!user ? 2 : false,
  });

  const preferencesQuery = useQuery<Preferences>({
    queryKey: ['preferences', user?.id],
    queryFn: async () => {
      console.log('[AppContext] Fetching preferences for user:', user?.id);
      try {
        if (!user || !isSupabaseConfigured) {
          const stored = await AsyncStorage.getItem(STORAGE_KEYS.PREFERENCES);
          if (stored) {
            const parsed = JSON.parse(stored) as Preferences;
            return { ...parsed, theme: 'dark' as const };
          }
          return {
            theme: 'dark' as const,
            colorTheme: 'mint' as const,
            fontSize: 'medium' as const,
            textToSpeech: false,
            reminders: false,
            aiPreferences: {
              consentStatus: 'unknown',
              personalizationEnabled: true,
            },
          };
        }

        const { data, error } = await supabase
          .from('preferences')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error || !data) {
          console.log('[AppContext] Preferences fetch error or no data:', error);
          return {
            theme: 'auto' as const,
            colorTheme: 'warm' as const,
            fontSize: 'medium' as const,
            textToSpeech: false,
            reminders: false,
          };
        }

        console.log('[AppContext] Preferences fetched');
        // Migration: 'mint' was the old hardcoded default (theme was also hardcoded to 'dark').
        // Neither was a deliberate user choice. Migrate those users to the new warm/light defaults.
        const isOldDefault = !data.color_theme || data.color_theme === 'mint';
        const migratedColorTheme = isOldDefault ? 'warm' : (data.color_theme as any);
        const migratedTheme: 'light' | 'dark' | 'auto' = isOldDefault ? 'auto' : ((data.theme as any) || 'auto');
        return {
          theme: migratedTheme,
          colorTheme: migratedColorTheme,
          fontSize: data.font_size as any,
          textToSpeech: data.text_to_speech,
          reminders: data.reminders,
          reminderTime: data.reminder_time || undefined,
          quickReminders: data.quick_reminders || undefined,
          customReminders: data.custom_reminders || undefined,
          autumnStyle: data.ai_preferences?.autumnStyle || undefined,
          autumnFocus: data.ai_preferences?.autumnFocus || undefined,
          autumnVerbosity: data.ai_preferences?.autumnVerbosity || undefined,
          journalCategories: data.ai_preferences?.journalCategories || undefined,
          journalDefaultTags: data.ai_preferences?.journalDefaultTags ?? undefined,
          journalAiSuggestions: data.ai_preferences?.journalAiSuggestions ?? undefined,
          aiPreferences: data.ai_preferences?.consent
            ? {
                consentStatus: data.ai_preferences.consent.status || 'unknown',
                consentVersion: data.ai_preferences.consent.version || undefined,
                consentedAt: data.ai_preferences.consent.at || undefined,
                personalizationEnabled: data.ai_preferences.personalizationEnabled !== false,
              }
            : {
                consentStatus: 'unknown',
                personalizationEnabled: true,
              },
        };
      } catch (error) {
        console.error('[AppContext] Preferences query error:', error);
        return {
          theme: 'auto' as const,
          colorTheme: 'warm' as const,
          fontSize: 'medium' as const,
          textToSpeech: false,
          reminders: false,
          aiPreferences: {
            consentStatus: 'unknown',
            personalizationEnabled: true,
          },
        };
      }
    },
    staleTime: 0,
    retry: isSupabaseConfigured && !!user ? 2 : false,
  });

  const chatHistoryQuery = useQuery({
    queryKey: ['chatHistory', user?.id || 'guest'],
    queryFn: async () => {
      // Never read the legacy unscoped value. It may contain another
      // account's transcript from an older app version.
      await AsyncStorage.removeItem(STORAGE_KEYS.CHAT_HISTORY);
      const stored = await AsyncStorage.getItem(getChatHistoryStorageKey(user?.id));
      return stored ? JSON.parse(stored) : [];
    },
  });

  const sharedAccessQuery = useQuery({
    queryKey: ['sharedAccess', user?.id, profileQuery.data?.id, !!user],
    queryFn: async () => {
      if (!user || !profileQuery.data?.id) return [];

      const { data, error } = await supabase
        .from('shared_access')
        .select('*')
        .or(`parent_id.eq.${profileQuery.data.id},therapist_id.eq.${profileQuery.data.id}`);

      if (error) {
        console.log('Shared access fetch error:', error);
        return [];
      }

      return (data || []).map((sa: any) => ({
        id: sa.id,
        childId: sa.child_id,
        parentId: sa.parent_id,
        therapistId: sa.therapist_id || undefined,
        therapistName: sa.therapist_name,
        therapistEmail: sa.therapist_email,
        therapistRole: sa.therapist_role as any,
        status: sa.status as any,
        inviteToken: sa.invite_token || undefined,
        canViewLogs: sa.can_view_logs,
        canViewProgress: sa.can_view_progress,
        canViewProfile: sa.can_view_profile,
        canAddNotes: sa.can_add_notes,
        canAddSessions: sa.can_add_sessions,
        canComment: sa.can_comment,
        canExport: sa.can_export,
        readonlyMode: sa.readonly_mode,
        createdAt: sa.created_at,
        acceptedAt: sa.accepted_at || undefined,
      }));
    },
    enabled: !!user && !!profileQuery.data?.id && isSupabaseConfigured,
    retry: isSupabaseConfigured ? 2 : false,
  });

  const therapistNotesQuery = useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: ['therapistNotes', user?.id, profileQuery.data?.children, profileQuery.data?.role, therapistClientChildIdsKey, !!user],
    queryFn: async () => {
      if (!user || !profileQuery.data) return [];

      const ownIds = (profileQuery.data.children || []).map(c => c.id);
      const childIds = profileQuery.data.role === 'therapist'
        ? therapistClientChildIds
        : ownIds;
      if (childIds.length === 0) return [];

      const { data, error } = await supabase
        .from('therapist_notes')
        .select('*')
        .in('child_id', childIds);

      if (error) {
        console.log('Therapist notes fetch error:', error);
        return [];
      }

      return (data || []).map((note: any) => ({
        id: note.id,
        childId: note.child_id,
        therapistId: note.therapist_id,
        sharedAccessId: note.shared_access_id,
        sessionDate: note.session_date,
        goalsWorkedOn: note.goals_worked_on || undefined,
        skillsPracticed: note.skills_practiced || undefined,
        behaviorsObserved: note.behaviors_observed || undefined,
        strategiesUsed: note.strategies_used || undefined,
        recommendations: note.recommendations || undefined,
        nextSessionGoals: note.next_session_goals || undefined,
        createdAt: note.created_at,
        updatedAt: note.updated_at,
      }));
    },
    enabled: !!profileQuery.data && isSupabaseConfigured && !!user,
    retry: isSupabaseConfigured ? 2 : false,
  });

  const chatMessagesQuery = useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: ['chatMessages', user?.id, sharedAccessQuery.data?.filter(sa => sa.status === 'accepted').map(sa => sa.id).sort().join(','), !!user],
    queryFn: async () => {
      if (!user || !sharedAccessQuery.data || sharedAccessQuery.data.length === 0) return [];

      const sharedAccessIds = sharedAccessQuery.data
        .filter(sa => sa.status === 'accepted')
        .map(sa => sa.id);
      
      if (sharedAccessIds.length === 0) return [];

      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          *,
          sender:profiles!chat_messages_sender_id_fkey(caregiver_name, role)
        `)
        .in('shared_access_id', sharedAccessIds)
        .order('created_at', { ascending: true });

      if (error) {
        console.log('Chat messages fetch error:', error);
        return [];
      }

      return (data || []).map((msg: any) => {
        let senderName = msg.sender?.caregiver_name || 'Unknown';
        if (senderName === 'Unknown') {
          const relatedAccess = sharedAccessQuery.data?.find(
            (sa: any) => sa.id === msg.shared_access_id
          );
          if (relatedAccess?.therapistName) {
            senderName = relatedAccess.therapistName;
          }
        }
        return {
          id: msg.id,
          sharedAccessId: msg.shared_access_id,
          senderId: msg.sender_id,
          senderName,
          messageText: msg.message_text,
          isRead: msg.is_read,
          createdAt: msg.created_at,
        };
      });
    },
    enabled: !!user && !!sharedAccessQuery.data && sharedAccessQuery.data.length > 0 && isSupabaseConfigured,
    retry: isSupabaseConfigured ? 2 : false,
  });

  useEffect(() => {
    if (authIsAuthenticated || profileQuery.data) {
      setIsAuthenticated(true);
    } else if (!authIsAuthenticated && !profileQuery.data) {
      setIsAuthenticated(false);
    }
  }, [authIsAuthenticated, profileQuery.data]);

  useEffect(() => {
    if (!user || !sharedAccessQuery.data || sharedAccessQuery.data.length === 0) return;
    const acceptedIds = sharedAccessQuery.data.filter((s) => s.status === 'accepted').map((s) => s.id);
    if (acceptedIds.length === 0) return;
    console.log('[AppContext] Subscribing to chat_messages realtime for', acceptedIds.length, 'conversations');
    const channel = supabase
      .channel(`chat_messages_${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_messages' },
        (payload) => {
          const row = (payload.new || payload.old) as { shared_access_id?: string } | undefined;
          if (row?.shared_access_id && acceptedIds.includes(row.shared_access_id)) {
            void queryClient.invalidateQueries({ queryKey: ['chatMessages'] });
          }
        },
      )
      .subscribe((status) => {
        console.log('[AppContext] chat realtime status:', status);
      });
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, sharedAccessQuery.data, queryClient]);

  const { mutate: saveProfileMutate } = useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!user) {
        await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
        return profile;
      }

      const profileData = {
        user_id: user.id,
        role: profile.role,
        caregiver_name: profile.caregiverName || null,
        caregiver_email: profile.caregiverEmail || null,
        caregiver_phone: profile.caregiverPhone || null,
        therapist_phone: profile.therapistPhone || null,
        avatar: profile.avatar || null,
        active_child_id: profile.activeChildId || null,
        is_explore_mode: profile.isExploreMode || false,
      };

      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      let savedProfile;
      if (existingProfile) {
        const { data, error } = await supabase
          .from('profiles')
          .update(profileData)
          .eq('user_id', user.id)
          .select()
          .single();
        if (error) throw error;
        savedProfile = data;
      } else {
        const { data, error } = await supabase
          .from('profiles')
          .insert(profileData)
          .select()
          .single();
        if (error) throw error;
        savedProfile = data;
      }

      if (profile.children && profile.children.length > 0) {
        const existingChildIds = profile.children
          .filter(child => child.id && !child.id.startsWith('temp_'))
          .map(child => child.id);

        if (existingChildIds.length > 0) {
          await supabase.from('children').delete()
            .eq('profile_id', savedProfile.id)
            .not('id', 'in', `(${existingChildIds.join(',')})`);
        } else {
          await supabase.from('children').delete().eq('profile_id', savedProfile.id);
        }

        for (const child of profile.children) {
          const childData = {
            profile_id: savedProfile.id,
            name: child.name,
            age: child.age,
            diagnosis: child.diagnosis || null,
            grade_level: child.gradeLevel || null,
            school_name: child.schoolName || null,
            height: child.height || null,
            weight: child.weight || null,
            common_triggers: child.commonTriggers || [],
            strengths: child.strengths || null,
            interests: child.interests || null,
            avatar: child.avatar || null,
          };

          if (child.id && !child.id.startsWith('temp_')) {
            const { error: upsertError } = await supabase.from('children')
              .upsert({ id: child.id, ...childData }, { onConflict: 'id' });
            if (upsertError) {
              console.error('[AppContext] Child upsert error:', upsertError);
            }
          } else {
            const { error: insertError } = await supabase.from('children')
              .insert(childData);
            if (insertError) {
              console.error('[AppContext] Child insert error:', insertError);
            }
          }
        }

        const { data: freshChildren } = await supabase
          .from('children')
          .select('id')
          .eq('profile_id', savedProfile.id)
          .limit(1);

        if (freshChildren && freshChildren.length > 0 && !profile.activeChildId) {
          await supabase.from('profiles')
            .update({ active_child_id: freshChildren[0].id })
            .eq('id', savedProfile.id);
        }
      }

      return profile;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['userProfile', user?.id] });
      setIsAuthenticated(true);
    },
  });

  const { mutate: saveLogMutate } = useMutation({
    mutationFn: async (entry: AnyLogEntry) => {
      console.log('[AppContext] Saving log entry:', entry.type, entry.id);
      
      if (!user) {
        const current = logsQuery.data || [];
        const existingIndex = current.findIndex(e => e.id === entry.id);
        const updated = existingIndex >= 0
          ? current.map((e, i) => i === existingIndex ? entry as LogEntry : e)
          : [...current, entry as LogEntry];
        await AsyncStorage.setItem(STORAGE_KEYS.LOG_ENTRIES, JSON.stringify(updated));
        return updated;
      }

      let logData: Record<string, any> = {
        child_id: entry.childId,
        date: entry.date,
        type: entry.type,
      };

      if (entry.type === 'daily') {
        const dailyEntry = entry as DailyLogEntry;
        logData = {
          ...logData,
          mood_rating: dailyEntry.overallRating,
          positive_notes: dailyEntry.whatWentWell || null,
          challenge_notes: dailyEntry.whatWasChallenging || null,
          mood_tags: dailyEntry.moodTags || [],
          sleep_hours: dailyEntry.sleepHours || null,
          photos: dailyEntry.photo ? [dailyEntry.photo] : null,
        };
      } else if (entry.type === 'meltdown') {
        const meltdownEntry = entry as MeltdownLogEntry;
        logData = {
          ...logData,
          mood_rating: meltdownEntry.moodAtEvent,
          triggers: meltdownEntry.triggers || [],
          behaviors: [meltdownEntry.severity, `${meltdownEntry.durationMinutes}min`],
          challenge_notes: meltdownEntry.additionalNotes || null,
          photos: meltdownEntry.photo ? [meltdownEntry.photo] : null,
          mood_tags: [],
        };
      } else {
        const genericEntry = entry as LogEntry;
        logData = {
          ...logData,
          mood_rating: genericEntry.moodRating,
          positive_notes: genericEntry.positiveNotes || null,
          challenge_notes: genericEntry.challengeNotes || null,
          mood_tags: genericEntry.moodTags || [],
          behaviors: genericEntry.behaviors || null,
          sleep_hours: genericEntry.sleepHours || null,
          triggers: genericEntry.triggers || null,
          voice_notes: genericEntry.voiceNotes || null,
          photos: genericEntry.photos || null,
        };
      }

      console.log('[AppContext] Log data to save:', logData);

      const { data: existing } = await supabase
        .from('log_entries')
        .select('id')
        .eq('id', entry.id)
        .single();

      let result;
      if (existing) {
        const { data, error } = await supabase.from('log_entries').update(logData).eq('id', entry.id).select();
        if (error) {
          console.error('[AppContext] Error updating log:', JSON.stringify(error, null, 2));
          console.error('[AppContext] Error details:', error.message, error.details, error.hint);
          throw error;
        }
        result = data;
        console.log('[AppContext] Log updated:', result);
      } else {
        const { data, error } = await supabase.from('log_entries').insert({ id: entry.id, ...logData }).select();
        if (error) {
          console.error('[AppContext] Error inserting log:', JSON.stringify(error, null, 2));
          console.error('[AppContext] Error details:', error.message, error.details, error.hint);
          throw error;
        }
        result = data;
        console.log('[AppContext] Log inserted:', result);
      }

      return logsQuery.data || [];
    },
    onSuccess: () => {
      console.log('[AppContext] Log save successful, invalidating queries');
      void queryClient.invalidateQueries({ queryKey: ['logEntries', user?.id] });
    },
    onError: (error: any) => {
      console.error('[AppContext] Log save failed:', JSON.stringify(error, null, 2));
      console.error('[AppContext] Error details:', error?.message, error?.details, error?.hint);
      console.error('[AppContext] Error stack:', error?.stack);
    },
  });

  const { mutate: deleteLogMutate } = useMutation({
    mutationFn: async (logId: string) => {
      if (!user) {
        const current = logsQuery.data || [];
        const updated = current.filter(e => e.id !== logId);
        await AsyncStorage.setItem(STORAGE_KEYS.LOG_ENTRIES, JSON.stringify(updated));
        return updated;
      }

      await supabase.from('log_entries').delete().eq('id', logId);
      return logsQuery.data || [];
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['logEntries', user?.id] });
    },
  });

  const { mutate: savePreferencesMutate } = useMutation({
    mutationFn: async (prefs: Preferences) => {
      if (!user) {
        await AsyncStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(prefs));
        return prefs;
      }

      const prefsData = {
        user_id: user.id,
        theme: prefs.theme,
        color_theme: prefs.colorTheme,
        font_size: prefs.fontSize,
        text_to_speech: prefs.textToSpeech,
        reminders: prefs.reminders,
        reminder_time: prefs.reminderTime || null,
        quick_reminders: prefs.quickReminders || null,
        custom_reminders: prefs.customReminders || null,
        ai_preferences: {
          autumnStyle: prefs.autumnStyle || 'warm',
          autumnFocus: prefs.autumnFocus || ['autism', 'behavior', 'emotional', 'sleep', 'sensory'],
          autumnVerbosity: prefs.autumnVerbosity || 'balanced',
          journalCategories: prefs.journalCategories || undefined,
          journalDefaultTags: prefs.journalDefaultTags || undefined,
          journalAiSuggestions: prefs.journalAiSuggestions !== false,
          consent: {
            status: prefs.aiPreferences?.consentStatus || 'unknown',
            version: prefs.aiPreferences?.consentVersion || undefined,
            at: prefs.aiPreferences?.consentedAt || undefined,
          },
          personalizationEnabled: prefs.aiPreferences?.personalizationEnabled !== false,
        },
      };

      await AsyncStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(prefs));

      const { data: existing } = await supabase
        .from('preferences')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (existing) {
        await supabase.from('preferences').update(prefsData).eq('user_id', user.id);
      } else {
        await supabase.from('preferences').insert(prefsData);
      }

      return prefs;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['preferences', user?.id] });
    },
  });

  const { mutate: saveChatHistoryMutate } = useMutation({
    mutationFn: async (messages: any[]) => {
      await AsyncStorage.setItem(getChatHistoryStorageKey(user?.id), JSON.stringify(messages));
      return messages;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['chatHistory', user?.id || 'guest'], data);
    },
  });

  const { mutate: clearChatHistoryMutate } = useMutation({
    mutationFn: async () => {
      await AsyncStorage.removeItem(getChatHistoryStorageKey(user?.id));
      return [];
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['chatHistory', user?.id || 'guest'], data);
    },
  });

  const { mutate: saveSharedAccessMutate } = useMutation({
    mutationFn: async (access: SharedAccess) => {
      if (!user || !profileQuery.data?.id) throw new Error('Not authenticated');

      const accessData = {
        child_id: access.childId,
        parent_id: access.parentId,
        therapist_id: access.therapistId || null,
        therapist_name: access.therapistName,
        therapist_email: access.therapistEmail,
        therapist_role: access.therapistRole,
        status: access.status,
        invite_token: access.inviteToken || null,
        can_view_logs: access.canViewLogs,
        can_view_progress: access.canViewProgress,
        can_view_profile: access.canViewProfile,
        can_add_notes: access.canAddNotes,
        can_add_sessions: access.canAddSessions,
        can_comment: access.canComment,
        can_export: access.canExport,
        readonly_mode: access.readonlyMode,
      };

      const { data: existing } = await supabase
        .from('shared_access')
        .select('id')
        .eq('id', access.id)
        .single();

      if (existing) {
        await supabase.from('shared_access').update(accessData).eq('id', access.id);
      } else {
        await supabase.from('shared_access').insert({ id: access.id, ...accessData });
      }

      return access;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sharedAccess', user?.id] });
    },
  });

  const { mutate: deleteSharedAccessMutate } = useMutation({
    mutationFn: async (accessId: string) => {
      if (!user) throw new Error('Not authenticated');
      await supabase.from('shared_access').delete().eq('id', accessId);
      return accessId;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sharedAccess', user?.id] });
    },
  });

  const { mutate: saveTherapistNoteMutate } = useMutation({
    mutationFn: async (note: TherapistNote) => {
      if (!user) throw new Error('Not authenticated');

      const noteData = {
        child_id: note.childId,
        therapist_id: note.therapistId,
        shared_access_id: note.sharedAccessId,
        session_date: note.sessionDate,
        goals_worked_on: note.goalsWorkedOn || null,
        skills_practiced: note.skillsPracticed || null,
        behaviors_observed: note.behaviorsObserved || null,
        strategies_used: note.strategiesUsed || null,
        recommendations: note.recommendations || null,
        next_session_goals: note.nextSessionGoals || null,
      };

      const { data: existing } = await supabase
        .from('therapist_notes')
        .select('id')
        .eq('id', note.id)
        .single();

      if (existing) {
        await supabase.from('therapist_notes').update(noteData).eq('id', note.id);
      } else {
        await supabase.from('therapist_notes').insert({ id: note.id, ...noteData });
      }

      return note;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['therapistNotes', user?.id] });
    },
  });

  const { mutate: saveChatMessageMutate } = useMutation({
    mutationFn: async (message: Omit<ChatMessage, 'id' | 'createdAt'>) => {
      if (!user || !profileQuery.data?.id) throw new Error('Not authenticated');

      const messageData = {
        shared_access_id: message.sharedAccessId,
        sender_id: profileQuery.data.id,
        message_text: message.messageText,
        is_read: false,
      };

      const { data, error } = await supabase
        .from('chat_messages')
        .insert(messageData)
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        sharedAccessId: data.shared_access_id,
        senderId: data.sender_id,
        senderName: message.senderName,
        messageText: data.message_text,
        isRead: data.is_read,
        createdAt: data.created_at,
      } as ChatMessage;
    },
    onMutate: async (message) => {
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const optimistic: ChatMessage = {
        id: tempId,
        sharedAccessId: message.sharedAccessId,
        senderId: profileQuery.data?.id || '',
        senderName: message.senderName,
        messageText: message.messageText,
        isRead: false,
        createdAt: new Date().toISOString(),
      };
      queryClient.setQueriesData<ChatMessage[]>({ queryKey: ['chatMessages'] }, (old) => {
        return [...(old || []), optimistic];
      });
      return { tempId };
    },
    onSuccess: (saved, _vars, ctx) => {
      const tempId = (ctx as any)?.tempId as string | undefined;
      queryClient.setQueriesData<ChatMessage[]>({ queryKey: ['chatMessages'] }, (old) => {
        if (!Array.isArray(old)) return old;
        return old.map((m) => (m.id === tempId ? saved : m));
      });
      void queryClient.invalidateQueries({ queryKey: ['chatMessages'] });
    },
    onError: (_err, _vars, ctx) => {
      const tempId = (ctx as any)?.tempId as string | undefined;
      if (!tempId) return;
      queryClient.setQueriesData<ChatMessage[]>({ queryKey: ['chatMessages'] }, (old) => {
        if (!Array.isArray(old)) return old;
        return old.filter((m) => m.id !== tempId);
      });
    },
  });

  const { mutate: markMessageAsReadMutate } = useMutation({
    mutationFn: async (messageId: string) => {
      if (!user) throw new Error('Not authenticated');

      await supabase
        .from('chat_messages')
        .update({ is_read: true })
        .eq('id', messageId);

      return messageId;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['chatMessages', user?.id] });
    },
  });

  const { mutate: markConversationAsReadMutate } = useMutation({
    mutationFn: async (sharedAccessId: string) => {
      if (!user || !profileQuery.data?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('chat_messages')
        .update({ is_read: true })
        .eq('shared_access_id', sharedAccessId)
        .neq('sender_id', profileQuery.data.id)
        .eq('is_read', false)
        .select('id');

      if (error) throw error;
      return { markedCount: (data || []).length };
    },
    onSuccess: (_result, sharedAccessId) => {
      void queryClient.invalidateQueries({ queryKey: ['chatMessages', user?.id] });
    },
  });

  const { mutate: logoutMutate } = useMutation({
    mutationFn: async () => {
      if (user) {
        await supabase.auth.signOut();
      }
      await AsyncStorage.removeItem(STORAGE_KEYS.USER_PROFILE);
      await AsyncStorage.removeItem(STORAGE_KEYS.LOG_ENTRIES);
      await AsyncStorage.removeItem(STORAGE_KEYS.PREFERENCES);
      // Preserve each account's namespaced transcript so it can be restored
      // when that same account signs back in, but remove the old shared key.
      await AsyncStorage.removeItem(STORAGE_KEYS.CHAT_HISTORY);
    },
    onSuccess: () => {
      queryClient.clear();
      setIsAuthenticated(false);
    },
  });

  const setActiveChild = useCallback((childId: string) => {
    if (profileQuery.data) {
      saveProfileMutate({
        ...profileQuery.data,
        activeChildId: childId,
      });
    }
  }, [profileQuery.data, saveProfileMutate]);

  const activeChild = useMemo(() => {
    if (!profileQuery.data?.children || profileQuery.data.children.length === 0) return null;
    if (profileQuery.data.activeChildId) {
      const found = profileQuery.data.children.find(c => c.id === profileQuery.data?.activeChildId);
      if (found) return found;
    }
    console.log('[AppContext] activeChildId missing or stale, falling back to first child');
    return profileQuery.data.children[0] ?? null;
  }, [profileQuery.data]);

  const activeChildLogs = useMemo(() => {
    if (!activeChild?.id) return [];
    const logs = logsQuery.data || [];
    return logs.filter(log => log?.childId === activeChild.id);
  }, [activeChild, logsQuery.data]);

  const streak = useMemo(() => {
    if (!activeChildLogs.length) return 0;
    
    const sorted = [...activeChildLogs].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    let count = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (const log of sorted) {
      const logDate = new Date(log.date);
      logDate.setHours(0, 0, 0, 0);
      
      const expectedDate = new Date(today);
      expectedDate.setDate(today.getDate() - count);
      
      if (logDate.getTime() === expectedDate.getTime()) {
        count++;
      } else {
        break;
      }
    }
    
    return count;
  }, [activeChildLogs]);

  const saveProfile = useCallback((profile: UserProfile) => saveProfileMutate(profile), [saveProfileMutate]);
  const saveLog = useCallback((entry: AnyLogEntry) => saveLogMutate(entry), [saveLogMutate]);
  const deleteLog = useCallback((logId: string) => deleteLogMutate(logId), [deleteLogMutate]);
  const savePreferences = useCallback((prefs: Preferences) => savePreferencesMutate(prefs), [savePreferencesMutate]);
  const saveChatHistory = useCallback((messages: any[]) => saveChatHistoryMutate(messages), [saveChatHistoryMutate]);
  const clearChatHistory = useCallback(() => clearChatHistoryMutate(), [clearChatHistoryMutate]);
  const logout = useCallback((onSuccess?: () => void) => {
    logoutMutate(undefined, {
      onSuccess: () => {
        queryClient.clear();
        setIsAuthenticated(false);
        if (onSuccess) {
          onSuccess();
        }
      },
    });
  }, [logoutMutate, queryClient]);
  const saveSharedAccess = useCallback((access: SharedAccess) => saveSharedAccessMutate(access), [saveSharedAccessMutate]);
  const deleteSharedAccess = useCallback((accessId: string) => deleteSharedAccessMutate(accessId), [deleteSharedAccessMutate]);
  const saveTherapistNote = useCallback((note: TherapistNote) => saveTherapistNoteMutate(note), [saveTherapistNoteMutate]);
  const saveChatMessage = useCallback((message: Omit<ChatMessage, 'id' | 'createdAt'>) => saveChatMessageMutate(message), [saveChatMessageMutate]);
  const markMessageAsRead = useCallback((messageId: string) => markMessageAsReadMutate(messageId), [markMessageAsReadMutate]);
  const markConversationAsRead = useCallback((sharedAccessId: string) => markConversationAsReadMutate(sharedAccessId), [markConversationAsReadMutate]);
  
  const addSharedAccess = useCallback((data: Omit<SharedAccess, 'id' | 'createdAt' | 'acceptedAt' | 'parentId'>) => {
    if (!profileQuery.data?.id) {
      console.error('No profile ID available');
      return;
    }
    const newAccess: SharedAccess = {
      ...data,
      id: `sa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      parentId: profileQuery.data.id,
      createdAt: new Date().toISOString(),
    };
    saveSharedAccessMutate(newAccess);
  }, [profileQuery.data?.id, saveSharedAccessMutate]);

  return useMemo(() => ({
    isAuthenticated,
    profile: profileQuery.data || undefined,
    logs: logsQuery.data || [],
    preferences: preferencesQuery.data,
    chatHistory: chatHistoryQuery.data || [],
    sharedAccess: sharedAccessQuery.data || [],
    therapistNotes: therapistNotesQuery.data || [],
    chatMessages: chatMessagesQuery.data || [],
    therapistClients: therapistClientsQuery.data || [],
    activeChild,
    activeChildLogs,
    streak,
    isLoading: profileQuery.isLoading || logsQuery.isLoading || preferencesQuery.isLoading || chatHistoryQuery.isLoading || sharedAccessQuery.isLoading || therapistNotesQuery.isLoading || chatMessagesQuery.isLoading,
    saveProfile,
    saveLog,
    deleteLog,
    savePreferences,
    saveChatHistory,
    clearChatHistory,
    logout,
    setActiveChild,
    saveSharedAccess,
    addSharedAccess,
    deleteSharedAccess,
    saveTherapistNote,
    saveChatMessage,
    markMessageAsRead,
    markConversationAsRead,
  }), [isAuthenticated, profileQuery.data, profileQuery.isLoading, logsQuery.data, logsQuery.isLoading, preferencesQuery.data, preferencesQuery.isLoading, chatHistoryQuery.data, chatHistoryQuery.isLoading, sharedAccessQuery.data, sharedAccessQuery.isLoading, therapistNotesQuery.data, therapistNotesQuery.isLoading, chatMessagesQuery.data, chatMessagesQuery.isLoading, therapistClientsQuery.data, activeChild, activeChildLogs, streak, saveProfile, saveLog, deleteLog, savePreferences, saveChatHistory, clearChatHistory, logout, setActiveChild, saveSharedAccess, addSharedAccess, deleteSharedAccess, saveTherapistNote, saveChatMessage, markMessageAsRead, markConversationAsRead]);
});

export function useActiveChildLogs(startDate?: Date, endDate?: Date) {
  const { activeChildLogs } = useApp();
  
  return useMemo(() => {
    if (!startDate && !endDate) return activeChildLogs;
    
    return activeChildLogs.filter(log => {
      const logDate = new Date(log.date);
      if (startDate && logDate < startDate) return false;
      if (endDate && logDate > endDate) return false;
      return true;
    });
  }, [activeChildLogs, startDate, endDate]);
}
