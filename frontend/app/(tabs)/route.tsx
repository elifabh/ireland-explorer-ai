import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  TouchableOpacity, StatusBar, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppStore } from '../../src/store/appStore';
import { t } from '../../src/utils/translations';
import { StopNode } from '../../src/components/StopNode';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../src/theme';
import { ThemedHeader } from '../../src/components/ui';

export default function RouteScreen() {
  const router = useRouter();
  const { user, currentTrip, currentStops, isLoading, loadTrip, startTrip } = useAppStore();
  const lang = user?.settings?.language || 'en';

  const handleStopPress = (stop: any) => router.push(`/stop/${stop.id}`);

  const handleStartTrip = async () => {
    if (currentTrip) await startTrip(currentTrip.id);
  };

  const progress = currentTrip
    ? Math.round((currentTrip.completed_stops / Math.max(1, currentTrip.total_stops)) * 100)
    : 0;

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'completed':
        return { colors: ['#059669', '#047857'] as [string, string], icon: 'checkmark-circle', label: lang === 'en' ? 'Trip Completed! 🎉' : 'Turas Críochnaithe! 🎉' };
      case 'in_progress':
        return { colors: [Colors.goldBright, Colors.gold] as [string, string], icon: 'navigate-circle', label: lang === 'en' ? 'In Progress' : 'Ar Siúl' };
      default:
        return { colors: ['#64748B', '#475569'] as [string, string], icon: 'time', label: lang === 'en' ? 'Ready to Start' : 'Réidh le Tosnú' };
    }
  };

  if (!currentTrip) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={['#022C22', '#064E3B']} style={styles.emptyHero}>
          <SafeAreaView style={styles.emptyHeroInner}>
            <Text style={styles.emptyEmoji}>🗺️</Text>
            <Text style={styles.emptyHeroTitle}>{t('route.noTrip', lang)}</Text>
            <Text style={styles.emptyHeroSub}>{t('route.startTrip', lang)}</Text>
          </SafeAreaView>
        </LinearGradient>
        <View style={styles.emptyBody}>
          <TouchableOpacity onPress={() => router.push('/')} activeOpacity={0.88}>
            <LinearGradient
              colors={['#059669', '#064E3B']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.createBtn}
            >
              <Ionicons name="add-circle" size={22} color="#fff" />
              <Text style={styles.createBtnText}>
                {lang === 'en' ? 'Create New Trip' : 'Cruthaigh Turas Nua'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const cfg = getStatusConfig(currentTrip.status);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      <ThemedHeader
        title={t('route.title', lang)}
        subtitle={`${currentTrip.completed_stops}/${currentTrip.total_stops} ${lang === 'en' ? 'stops completed' : 'stadanna críochnaithe'}`}
        rightComponent={
          currentTrip.status === 'approved' && (
            <TouchableOpacity onPress={handleStartTrip} activeOpacity={0.88}>
              <LinearGradient colors={[Colors.goldBright, Colors.gold]} style={styles.startBtnSmall}>
                <Ionicons name="play" size={14} color="#fff" />
                <Text style={styles.startBtnTextSmall}>{lang === 'en' ? 'Start' : 'Tosaigh'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          )
        }
      />

      <View style={styles.headerExtra}>
        <View style={styles.progressWrap}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress}%` as any }]} />
          </View>
          <Text style={styles.progressPct}>{progress}%</Text>
        </View>
      </View>

      {/* ── Status + Points Banner ── */}
      <View style={styles.bannerRow}>
        <LinearGradient colors={cfg.colors} style={styles.statusBadge}>
          <Ionicons name={cfg.icon as any} size={14} color="#fff" />
          <Text style={styles.statusText}>{cfg.label}</Text>
        </LinearGradient>

        {currentTrip.total_points > 0 && (
          <View style={styles.pointsBadge}>
            <Ionicons name="star" size={14} color={Colors.goldBright} />
            <Text style={styles.pointsText}>
              +{currentTrip.total_points} {lang === 'en' ? 'pts earned' : 'pointí'}
            </Text>
          </View>
        )}
      </View>

      {/* ── Stops List ── */}
      <ScrollView
        style={styles.stopsScroll}
        contentContainerStyle={styles.stopsContent}
        showsVerticalScrollIndicator={false}
      >
        {currentStops.map((stop, index) => (
          <StopNode
            key={stop.id}
            stop={stop}
            isFirst={index === 0}
            isLast={index === currentStops.length - 1}
            lang={lang}
            onPress={handleStopPress}
          />
        ))}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.offWhite },

  // Empty state
  emptyHero: { paddingBottom: 40 },
  emptyHeroInner: { alignItems: 'center', paddingHorizontal: Spacing.base, paddingTop: 60 },
  emptyEmoji: { fontSize: 64, marginBottom: 12 },
  emptyHeroTitle: { fontSize: Typography.xl, fontWeight: '800', color: '#fff', textAlign: 'center' },
  emptyHeroSub: { fontSize: Typography.base, color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginTop: 6 },
  emptyBody: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.base },
  createBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 28, paddingVertical: 15, borderRadius: Radius.xl,
  },
  createBtnText: { color: '#fff', fontSize: Typography.base, fontWeight: '700' },

  // Active trip
  startBtnSmall: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full,
  },
  startBtnTextSmall: { color: '#fff', fontWeight: '700', fontSize: 11 },
  headerExtra: { backgroundColor: '#065F46', paddingBottom: Spacing.base },
  progressWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: Spacing.base,
  },
  progressTrack: { flex: 1, height: 7, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.goldBright, borderRadius: 4 },
  progressPct: { fontSize: Typography.xs, fontWeight: '700', color: Colors.goldBright, minWidth: 32, textAlign: 'right' },

  bannerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.base, paddingVertical: 10,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: Colors.mist,
  },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full,
  },
  statusText: { color: '#fff', fontSize: Typography.xs, fontWeight: '700' },
  pointsBadge: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  pointsText: { fontSize: Typography.sm, fontWeight: '700', color: Colors.gold },

  stopsScroll: { flex: 1 },
  stopsContent: { paddingVertical: Spacing.base },
});
