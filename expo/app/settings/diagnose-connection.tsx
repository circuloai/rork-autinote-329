import { useRouter } from 'expo-router';
import { ChevronLeft, Stethoscope, Copy, RefreshCw } from 'lucide-react-native';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import { useColors } from '@/hooks/useColors';
import ScaledText from '@/components/ScaledText';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

type SectionResult = {
  title: string;
  detail: string;
  ok: boolean;
};

type DiagnosticReport = {
  generatedAt: string;
  sections: SectionResult[];
  verdict: string;
};

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export default function DiagnoseConnectionScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { preferences } = useApp();
  const { user } = useAuth();
  const Colors = useColors(preferences);
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  const [loading, setLoading] = useState<boolean>(false);
  const [report, setReport] = useState<DiagnosticReport | null>(null);

  const runDiagnostic = useCallback(async () => {
    if (!user) {
      Alert.alert('Not signed in', 'Sign in to run the diagnostic.');
      return;
    }
    setLoading(true);
    const sections: SectionResult[] = [];
    let verdict = 'No obvious mismatch detected. Share the report below with support.';

    try {
      const authEmail = (user.email || '').toLowerCase().trim();
      sections.push({
        title: '1. Auth user',
        detail: safeStringify({ id: user.id, email: user.email, lowered: authEmail }),
        ok: !!authEmail,
      });

      const { data: profileRows, error: profileErr } = await supabase
        .from('profiles')
        .select('id, user_id, role, caregiver_name, caregiver_email, active_child_id, created_at')
        .eq('user_id', user.id);

      sections.push({
        title: '2. Profile rows for this user_id',
        detail: profileErr
          ? `ERROR: ${profileErr.message}`
          : safeStringify(profileRows),
        ok: !profileErr && (profileRows?.length ?? 0) === 1,
      });

      if ((profileRows?.length ?? 0) > 1) {
        verdict =
          'BUG FOUND: this auth user has more than one row in `profiles`. The app uses .single() and will pick whichever Postgres returns first, but the migration links invites to the most recent profile. Delete the duplicate profile rows in Supabase and keep only the most recent one.';
      } else if ((profileRows?.length ?? 0) === 0) {
        verdict =
          'BUG FOUND: no `profiles` row exists for this auth user. Sign out, sign in again, or create a profile manually.';
      }

      const profile = profileRows?.[0];

      const { data: byParent, error: byParentErr } = profile
        ? await supabase
            .from('shared_access')
            .select('*')
            .eq('parent_id', profile.id)
        : { data: [], error: null as any };

      sections.push({
        title: '3. shared_access rows where parent_id = my profile.id',
        detail: byParentErr
          ? `ERROR: ${byParentErr.message}`
          : safeStringify(byParent),
        ok: !byParentErr,
      });

      const { data: byTherapistId, error: byTherapistIdErr } = profile
        ? await supabase
            .from('shared_access')
            .select('*')
            .eq('therapist_id', profile.id)
        : { data: [], error: null as any };

      sections.push({
        title: '4. shared_access rows where therapist_id = my profile.id',
        detail: byTherapistIdErr
          ? `ERROR: ${byTherapistIdErr.message}`
          : safeStringify(byTherapistId),
        ok: !byTherapistIdErr,
      });

      const { data: byEmail, error: byEmailErr } = await supabase
        .from('shared_access')
        .select('*')
        .ilike('therapist_email', authEmail);

      sections.push({
        title: '5. shared_access rows where therapist_email = my auth email (case-insensitive)',
        detail: byEmailErr
          ? `ERROR: ${byEmailErr.message}`
          : safeStringify(byEmail),
        ok: !byEmailErr,
      });

      const therapistQueryReturns = profile
        ? await supabase
            .from('shared_access')
            .select('id, child_id, parent_id, therapist_id, therapist_email, status')
            .eq('therapist_id', profile.id)
            .eq('status', 'accepted')
        : { data: [], error: null as any };

      sections.push({
        title: "6. Therapist 'My Clients' query (therapist_id = me AND status = accepted)",
        detail: therapistQueryReturns.error
          ? `ERROR: ${therapistQueryReturns.error.message}`
          : safeStringify(therapistQueryReturns.data),
        ok: !therapistQueryReturns.error,
      });

      const parentQueryReturns = profile
        ? await supabase
            .from('shared_access')
            .select('id, child_id, parent_id, therapist_id, therapist_email, status')
            .or(`parent_id.eq.${profile.id},therapist_id.eq.${profile.id}`)
        : { data: [], error: null as any };

      sections.push({
        title: "7. Parent 'Connected Therapists' query (parent_id = me OR therapist_id = me)",
        detail: parentQueryReturns.error
          ? `ERROR: ${parentQueryReturns.error.message}`
          : safeStringify(parentQueryReturns.data),
        ok: !parentQueryReturns.error,
      });

      // Verdict logic.
      const matchedByEmail = byEmail || [];
      const matchedByTherapistId = byTherapistId || [];

      if (
        profile &&
        matchedByEmail.length > 0 &&
        matchedByEmail.every((r: any) => r.therapist_id !== profile.id)
      ) {
        verdict =
          'BUG FOUND: invitation rows exist for your email, but their `therapist_id` is NULL or points at a different profile. The acceptance step never wrote your profile.id onto the row. Open the screen "Check for invitations" once, or re-run MIGRATION_THERAPIST_INVITES.sql in Supabase.';
      } else if (
        profile &&
        matchedByTherapistId.length > 0 &&
        matchedByTherapistId.every((r: any) => r.status !== 'accepted')
      ) {
        verdict =
          "BUG FOUND: rows are linked to your profile but status is still 'pending'. Tap 'Check for invitations' on the My Clients screen, or run MIGRATION_THERAPIST_INVITES.sql again.";
      } else if (matchedByEmail.length === 0 && matchedByTherapistId.length === 0 && profile) {
        verdict =
          'NO INVITES FOUND for this account. Either no caregiver has invited you, or the invite email does not match your auth email exactly. Compare email casing and any "+" aliases.';
      } else if (
        profile &&
        matchedByTherapistId.some((r: any) => r.status === 'accepted')
      ) {
        verdict =
          'Therapist linkage looks correct in the database. If the UI still says "no clients", pull-to-refresh on the My Clients screen, then sign out and back in.';
      }

      setReport({
        generatedAt: new Date().toISOString(),
        sections,
        verdict,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      sections.push({ title: 'Unexpected error', detail: msg, ok: false });
      setReport({
        generatedAt: new Date().toISOString(),
        sections,
        verdict: `Diagnostic failed: ${msg}`,
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void runDiagnostic();
  }, [runDiagnostic]);

  const copyReport = useCallback(async () => {
    if (!report) return;
    const text =
      `Connection diagnostic — ${report.generatedAt}\n\nVERDICT:\n${report.verdict}\n\n` +
      report.sections
        .map((s) => `=== ${s.title} ===\n${s.detail}`)
        .join('\n\n');
    await Clipboard.setStringAsync(text);
    Alert.alert('Copied', 'Diagnostic report copied. Paste it in chat to share.');
  }, [report]);

  return (
    <View style={[styles.container, { backgroundColor: Colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <ScaledText style={styles.headerTitle}>Diagnose Connection</ScaledText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 60 }}>
        <View style={styles.intro}>
          <View style={styles.iconCircle}>
            <Stethoscope size={28} color={Colors.primary} />
          </View>
          <ScaledText style={styles.introTitle}>Therapist ↔ Caregiver linkage</ScaledText>
          <ScaledText style={styles.introBody}>
            Runs every read- and write-side query against Supabase for the account you&apos;re
            currently signed in as, then prints a verdict. Share the report with support if
            the verdict isn&apos;t conclusive.
          </ScaledText>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={runDiagnostic}
            disabled={loading}
            activeOpacity={0.7}
            testID="run-diagnostic"
          >
            <RefreshCw size={16} color={Colors.surface} />
            <ScaledText style={styles.primaryButtonText}>
              {loading ? 'Running…' : 'Re-run diagnostic'}
            </ScaledText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={copyReport}
            disabled={!report}
            activeOpacity={0.7}
            testID="copy-diagnostic"
          >
            <Copy size={16} color={Colors.primary} />
            <ScaledText style={styles.secondaryButtonText}>Copy report</ScaledText>
          </TouchableOpacity>
        </View>

        {loading && !report ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={Colors.primary} />
            <ScaledText style={styles.loadingText}>Querying Supabase…</ScaledText>
          </View>
        ) : null}

        {report ? (
          <>
            <View style={styles.verdictCard}>
              <ScaledText style={styles.verdictLabel}>Verdict</ScaledText>
              <ScaledText style={styles.verdictText}>{report.verdict}</ScaledText>
            </View>

            {report.sections.map((s) => (
              <View key={s.title} style={styles.sectionCard}>
                <ScaledText style={[styles.sectionTitle, !s.ok && { color: Colors.error }]}>
                  {s.title}
                </ScaledText>
                <ScaledText style={styles.sectionDetail} selectable>
                  {s.detail}
                </ScaledText>
              </View>
            ))}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const createStyles = (Colors: ReturnType<typeof getColors>) =>
  StyleSheet.create({
    container: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingBottom: 16,
      backgroundColor: Colors.background,
      borderBottomWidth: 1,
      borderBottomColor: Colors.border,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: Colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: { fontSize: 18, fontWeight: '700' as const, color: Colors.text },
    content: { flex: 1, paddingHorizontal: 20 },
    intro: { alignItems: 'center', paddingVertical: 20 },
    iconCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: Colors.primary + '18',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 12,
    },
    introTitle: {
      fontSize: 20,
      fontWeight: '700' as const,
      color: Colors.text,
      marginBottom: 6,
    },
    introBody: {
      fontSize: 14,
      color: Colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
    actions: { flexDirection: 'row', gap: 10, marginTop: 8, marginBottom: 20 },
    button: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      borderRadius: 12,
    },
    primaryButton: { backgroundColor: Colors.primary },
    primaryButtonText: {
      color: Colors.surface,
      fontWeight: '700' as const,
      fontSize: 14,
    },
    secondaryButton: {
      backgroundColor: Colors.primary + '15',
      borderWidth: 1,
      borderColor: Colors.primary + '40',
    },
    secondaryButtonText: {
      color: Colors.primary,
      fontWeight: '700' as const,
      fontSize: 14,
    },
    loadingBox: { alignItems: 'center', paddingVertical: 40, gap: 10 },
    loadingText: { color: Colors.textSecondary, fontSize: 13 },
    verdictCard: {
      backgroundColor: Colors.primary + '12',
      borderColor: Colors.primary + '40',
      borderWidth: 1,
      borderRadius: 14,
      padding: 16,
      marginBottom: 16,
    },
    verdictLabel: {
      fontSize: 12,
      fontWeight: '700' as const,
      color: Colors.primary,
      marginBottom: 6,
      letterSpacing: 0.5,
    },
    verdictText: { fontSize: 14, color: Colors.text, lineHeight: 20 },
    sectionCard: {
      backgroundColor: Colors.surface,
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: Colors.border,
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '700' as const,
      color: Colors.text,
      marginBottom: 8,
    },
    sectionDetail: {
      fontFamily: 'monospace' as const,
      fontSize: 11,
      color: Colors.textSecondary,
      lineHeight: 16,
    },
  });
