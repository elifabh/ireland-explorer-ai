import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  TouchableOpacity, ActivityIndicator, Platform, StatusBar,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppStore, TimePreset, StartLocation } from '../src/store/appStore';
import { t } from '../src/utils/translations';
import { Colors, Typography, Spacing, Radius, Shadow } from '../src/theme';
import { AnimatedEntry } from '../src/components/ui';

export default function PreviewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user, livePreview, isLoading, createTripPreview, createTrip } = useAppStore();
  const [creating, setCreating] = useState(false);
  const lang = user?.settings?.language || 'en';

  const location: StartLocation = {
    lat: parseFloat(params.lat as string) || 53.3498,
    lng: parseFloat(params.lng as string) || -6.2603,
    label: (params.label as string) || undefined,
    source: (params.source as 'gps' | 'manual') || 'manual',
  };
  const timePreset = (params.time as TimePreset) || '60m';

  useEffect(() => { createTripPreview(location, timePreset); }, []);

  const handleStartTrip = async () => {
    setCreating(true);
    const success = await createTrip(location, timePreset);
    setCreating(false);
    if (success) router.replace('/(tabs)/route');
  };

  const getWeatherIcon = (condition: string) => {
    const lower = condition.toLowerCase();
    if (lower.includes('sun') || lower.includes('clear')) return 'sunny';
    if (lower.includes('cloud') || lower.includes('overcast')) return 'partly-sunny';
    if (lower.includes('rain')) return 'rainy';
    if (lower.includes('wind')) return 'flag';
    return 'partly-sunny';
  };

  if (isLoading && !livePreview) {
    return (
      <View style={styles.root}>
        <LinearGradient colors={['#022C22', '#064E3B']} style={StyleSheet.absoluteFillObject} />
        <SafeAreaView style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={Colors.goldBright} />
          <Text style={styles.loadingTitle}>
            {lang === 'en' ? 'Preparing your adventure...' : 'Ag ullmhú do eachtra...'}
          </Text>
          <Text style={styles.loadingSubtitle}>
            {lang === 'en' ? 'AI is curating your route ☘️' : 'Tá an AI ag roghnú do bhealach ☘️'}
          </Text>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#022C22', '#064E3B', '#065F46']} style={styles.heroBg} />

      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
            <Ionicons name="close" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('preview.title', lang)}</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* Weather Card */}
          {livePreview?.weather && (
            <AnimatedEntry delay={100}>
              <LinearGradient
                colors={['rgba(255,255,255,0.16)', 'rgba(255,255,255,0.08)']}
                style={styles.weatherCard}
              >
                <View style={styles.rowBetween}>
                  <View style={styles.row}>
                    <Ionicons name={getWeatherIcon(livePreview.weather.condition) as any} size={28} color={Colors.goldBright} />
                    <Text style={styles.weatherTitle}>{t('preview.weather', lang)}</Text>
                  </View>
                  <Text style={styles.tempBig}>{livePreview.weather.temperature_c}°C</Text>
                </View>
                <Text style={styles.conditionText}>
                  {lang === 'en' ? livePreview.weather.condition : (livePreview.weather.condition_ga || livePreview.weather.condition)}
                </Text>
                <View style={styles.weatherDetails}>
                  <View style={styles.weatherDetail}>
                    <Ionicons name="flag" size={14} color="rgba(255,255,255,0.6)" />
                    <Text style={styles.weatherDetailText}>{livePreview.weather.wind_speed_kmh} km/h</Text>
                  </View>
                  <View style={styles.weatherDetail}>
                    <Ionicons name="water" size={14} color="rgba(255,255,255,0.6)" />
                    <Text style={styles.weatherDetailText}>
                      {Math.round((livePreview.weather.precipitation_chance ?? 0) * 100)}% {lang === 'en' ? 'rain' : 'báisteach'}
                    </Text>
                  </View>
                </View>
              </LinearGradient>
            </AnimatedEntry>
          )}

          {/* Stats Row */}
          <AnimatedEntry delay={200}>
            <View style={styles.statsRow}>
              {[
                { icon: 'location', value: livePreview?.estimated_stops || 0, label: t('preview.stops', lang), color: '#86EFAC' },
                { icon: 'time', value: livePreview?.estimated_duration_min || 0, label: `${t('preview.duration', lang)} (min)`, color: '#93C5FD' },
                { icon: 'star', value: (livePreview?.estimated_stops || 0) * 100, label: lang === 'en' ? 'Max Points' : 'Pointí Max', color: Colors.goldBright },
              ].map((stat, i) => (
                <React.Fragment key={i}>
                  <View style={styles.statItem}>
                    <Ionicons name={stat.icon as any} size={22} color={stat.color} />
                    <Text style={styles.statValue}>{stat.value}</Text>
                    <Text style={styles.statLabel}>{stat.label}</Text>
                  </View>
                  {i < 2 && <View style={styles.statDivider} />}
                </React.Fragment>
              ))}
            </View>
          </AnimatedEntry>

          {/* White content area */}
          <View style={styles.contentCard}>

            {/* Transit Info */}
            {livePreview?.transit && (
              <AnimatedEntry delay={280}>
                <View style={styles.infoRow}>
                  <View style={[styles.infoIcon, { backgroundColor: '#ECFEFF' }]}>
                    <Ionicons name="bus" size={18} color="#0891B2" />
                  </View>
                  <Text style={[styles.infoText, { color: '#0891B2' }]}>
                    {livePreview.transit.available
                      ? (livePreview.transit.nearest_stop
                        ? `${lang === 'en' ? 'Nearest stop' : 'Stad is gaire'}: ${livePreview.transit.nearest_stop}`
                        : (lang === 'en' ? 'Transit available' : 'Iompar ar fáil'))
                      : (lang === 'en' ? 'Limited transit' : 'Iompar teoranta')}
                  </Text>
                </View>
              </AnimatedEntry>
            )}

            {/* Warnings */}
            {livePreview?.warnings && livePreview.warnings.length > 0 && (
              <AnimatedEntry delay={320}>
                <View style={styles.warningCard}>
                  <View style={styles.row}>
                    <Ionicons name="warning" size={16} color="#DC2626" />
                    <Text style={styles.warningTitle}>
                      {lang === 'en' ? 'Important Notes' : 'Nótaí Tábhachtacha'}
                    </Text>
                  </View>
                  {livePreview.warnings.map((w, i) => (
                    <Text key={i} style={styles.warningText}>• {w}</Text>
                  ))}
                </View>
              </AnimatedEntry>
            )}

            {/* Events */}
            {livePreview?.events && livePreview.events.length > 0 && (
              <AnimatedEntry delay={360}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionIconCircle, { backgroundColor: '#F5F3FF' }]}>
                    <Ionicons name="calendar" size={16} color="#8B5CF6" />
                  </View>
                  <Text style={[styles.sectionTitle, { color: '#8B5CF6' }]}>
                    {lang === 'en' ? 'Nearby Events' : 'Imeachtaí'}
                  </Text>
                </View>
                {livePreview.events.map((event: any, i: number) => (
                  <View key={i} style={styles.eventCard}>
                    <Text style={styles.eventName}>
                      {lang === 'en' && event.name_ga ? event.name_ga : event.name}
                    </Text>
                    {event.venue && <Text style={styles.eventVenue}>{event.venue}</Text>}
                    {event.is_free && (
                      <View style={styles.freeBadge}>
                        <Text style={styles.freeBadgeText}>FREE</Text>
                      </View>
                    )}
                  </View>
                ))}
              </AnimatedEntry>
            )}

            {/* Preferences summary */}
            <AnimatedEntry delay={400}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIconCircle, { backgroundColor: Colors.emeraldLight }]}>
                  <Ionicons name="settings" size={16} color={Colors.emeraldBright} />
                </View>
                <Text style={[styles.sectionTitle, { color: Colors.emeraldBright }]}>
                  {lang === 'en' ? 'Your Preferences' : 'Do Roghanna'}
                </Text>
              </View>
              <View style={styles.prefBadges}>
                {[
                  { icon: user?.settings?.travel_mode === 'walk' ? 'walk' : user?.settings?.travel_mode === 'car' ? 'car' : 'bus', label: t(`mode.${user?.settings?.travel_mode || 'walk'}`, lang) },
                  { icon: 'speedometer', label: t(`pace.${user?.settings?.pace || 'normal'}`, lang) },
                  ...(user?.settings?.budget_free_only ? [{ icon: 'cash', label: lang === 'en' ? 'Free Only' : 'Saor in Aisce' }] : []),
                ].map((b, i) => (
                  <View key={i} style={styles.prefBadge}>
                    <Ionicons name={b.icon as any} size={13} color={Colors.emeraldBright} />
                    <Text style={styles.prefBadgeText}>{b.label}</Text>
                  </View>
                ))}
              </View>
            </AnimatedEntry>
          </View>

          <View style={{ height: 120 }} />
        </ScrollView>
      </SafeAreaView>

      {/* Bottom Actions */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
          <Text style={styles.cancelText}>{t('preview.cancel', lang)}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ flex: 2 }} onPress={handleStartTrip} disabled={creating} activeOpacity={0.88}>
          <LinearGradient
            colors={creating ? ['#94A3B8', '#64748B'] : ['#059669', '#064E3B']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.startBtn}
          >
            {creating
              ? <ActivityIndicator color="#fff" />
              : <>
                <Ionicons name="rocket" size={20} color="#fff" />
                <Text style={styles.startText}>{t('preview.startTrip', lang)}</Text>
              </>
            }
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#022C22' },
  heroBg: { position: 'absolute', top: 0, left: 0, right: 0, height: 320 },

  // Loading
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  loadingTitle: { fontSize: Typography.lg, fontWeight: '700', color: '#fff', textAlign: 'center' },
  loadingSubtitle: { fontSize: Typography.base, color: 'rgba(255,255,255,0.65)', textAlign: 'center' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.base, paddingVertical: 12,
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: Typography.md, fontWeight: '700', color: '#fff' },

  // Scroll
  scrollContent: { paddingHorizontal: Spacing.base, paddingTop: Spacing.sm },

  // Weather
  weatherCard: {
    borderRadius: Radius.xl, padding: Spacing.base, marginBottom: Spacing.md,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  weatherTitle: { fontSize: Typography.base, fontWeight: '600', color: '#fff' },
  tempBig: { fontSize: Typography.xxl, fontWeight: '800', color: '#fff' },
  conditionText: { fontSize: Typography.sm, color: 'rgba(255,255,255,0.7)', marginBottom: 10 },
  weatherDetails: { flexDirection: 'row', gap: 20 },
  weatherDetail: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  weatherDetailText: { fontSize: Typography.sm, color: 'rgba(255,255,255,0.65)' },

  // Stats
  statsRow: {
    flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: Radius.xl, marginBottom: Spacing.md,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    paddingVertical: Spacing.md,
  },
  statItem: { flex: 1, alignItems: 'center', gap: 3 },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.15)' },
  statValue: { fontSize: Typography.xl, fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: Typography.xs, color: 'rgba(255,255,255,0.6)', textAlign: 'center', fontWeight: '500' },

  // White content card
  contentCard: {
    backgroundColor: '#fff', borderRadius: Radius.xl,
    padding: Spacing.base, ...Shadow.md,
  },

  // Info row
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: Spacing.md },
  infoIcon: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  infoText: { fontSize: Typography.sm, fontWeight: '500', flex: 1 },

  // Warning
  warningCard: {
    backgroundColor: '#FEF2F2', borderRadius: Radius.md,
    padding: Spacing.md, marginBottom: Spacing.md,
    borderWidth: 1, borderColor: '#FECACA',
  },
  warningTitle: { fontSize: Typography.sm, fontWeight: '700', color: '#DC2626', marginLeft: 6 },
  warningText: { fontSize: Typography.sm, color: '#7F1D1D', marginTop: 4 },

  // Section header
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, marginTop: 4 },
  sectionIconCircle: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontSize: Typography.base, fontWeight: '700' },

  // Events
  eventCard: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.mist },
  eventName: { fontSize: Typography.base, fontWeight: '600', color: Colors.dark },
  eventVenue: { fontSize: Typography.sm, color: Colors.slate, marginTop: 2 },
  freeBadge: {
    alignSelf: 'flex-start', marginTop: 4,
    backgroundColor: Colors.emeraldLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4,
  },
  freeBadgeText: { fontSize: 10, fontWeight: '700', color: Colors.emerald },

  // Preferences
  prefBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  prefBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.emeraldLight,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full,
  },
  prefBadgeText: { fontSize: Typography.xs, color: Colors.emerald, fontWeight: '600' },

  // Bottom
  bottomBar: {
    flexDirection: 'row', gap: 12,
    paddingHorizontal: Spacing.base, paddingTop: Spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 36 : Spacing.base,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: Colors.mist,
  },
  cancelBtn: {
    flex: 1, paddingVertical: 16, borderRadius: Radius.lg,
    backgroundColor: Colors.offWhite, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: Colors.mist,
  },
  cancelText: { fontSize: Typography.base, fontWeight: '600', color: Colors.slate },
  startBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16, borderRadius: Radius.lg,
  },
  startText: { fontSize: Typography.base, fontWeight: '700', color: '#fff' },
});
