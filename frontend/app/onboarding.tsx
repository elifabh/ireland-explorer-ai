import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, Switch, Dimensions, Animated, StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../src/context/AppContext';
import { LocationPicker } from '../src/components/LocationPicker';
import { GeoLocation, TravelModeType, TimePresetType, PaceType } from '../src/types';
import { Colors, Typography, Spacing, Radius, Shadow } from '../src/theme';
import { ThemedHeader, ScaleOnPress } from '../src/components/ui';

const { width } = Dimensions.get('window');

const INTERESTS = [
  { id: 'history', icon: 'business', color: '#8B5CF6', label: 'History', labelGa: 'Stair' },
  { id: 'nature', icon: 'leaf', color: '#22C55E', label: 'Nature', labelGa: 'Dúlra' },
  { id: 'museums_indoor', icon: 'library', color: '#3B82F6', label: 'Museums', labelGa: 'Músaeim' },
  { id: 'viewpoints', icon: 'eye', color: '#F59E0B', label: 'Viewpoints', labelGa: 'Radhairc' },
];

const TIME_PRESETS: { id: TimePresetType; label: string; labelGa: string; icon: string }[] = [
  { id: '30m', label: '30 min', labelGa: '30 nóim', icon: 'timer-outline' },
  { id: '60m', label: '1 hour', labelGa: '1 uair', icon: 'time-outline' },
  { id: '90m', label: '1.5 hrs', labelGa: '1.5 uair', icon: 'time-outline' },
  { id: '2h', label: '2 hours', labelGa: '2 uair', icon: 'hourglass-outline' },
  { id: '4h', label: '4 hours', labelGa: '4 uair', icon: 'hourglass-outline' },
  { id: '1d', label: 'Full day', labelGa: 'Lá iomlán', icon: 'sunny-outline' },
];

const TRAVEL_MODES: { id: TravelModeType; icon: string; label: string; labelGa: string; color: string }[] = [
  { id: 'walk', icon: 'walk', label: 'Walk', labelGa: 'Siúl', color: '#10B981' },
  { id: 'public_transport', icon: 'bus', label: 'Transit', labelGa: 'Iompar', color: '#3B82F6' },
  { id: 'car', icon: 'car', label: 'Car', labelGa: 'Carr', color: '#F59E0B' },
];

const PACE_OPTIONS = [
  { id: 'relaxed' as PaceType, icon: 'cafe', label: 'Relaxed', labelGa: 'Réchúiseach', color: '#10B981' },
  { id: 'normal' as PaceType, icon: 'walk', label: 'Normal', labelGa: 'Gnách', color: '#3B82F6' },
  { id: 'fast' as PaceType, icon: 'flash', label: 'Fast', labelGa: 'Tapa', color: '#F59E0B' },
];

// ── Section wrapper ────────────────────────────────────────────────────────────
function Section({ icon, title, iconColor = Colors.emeraldBright, children }: {
  icon: string; title: string; iconColor?: string; children: React.ReactNode;
}) {
  return (
    <View style={sectionStyles.card}>
      <View style={sectionStyles.header}>
        <View style={[sectionStyles.iconCircle, { backgroundColor: iconColor + '20' }]}>
          <Ionicons name={icon as any} size={18} color={iconColor} />
        </View>
        <Text style={sectionStyles.title}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: Radius.xl,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    ...Shadow.sm,
    borderWidth: 1,
    borderColor: '#F0FDF4',
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  iconCircle: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: Typography.md, fontWeight: '700', color: Colors.dark },
});

export default function OnboardingScreen() {
  const router = useRouter();
  const { t, language, startLocation, setStartLocation, updateSettings, user } = useApp();

  const [selectedInterests, setSelectedInterests] = useState<string[]>(user?.settings.interests || []);
  const [timePreset, setTimePreset] = useState<TimePresetType>('60m');
  const [travelMode, setTravelMode] = useState<TravelModeType>('walk');
  const [pace, setPace] = useState<PaceType>('normal');
  const [budgetFreeOnly, setBudgetFreeOnly] = useState(user?.settings.budget_free_only || false);
  const [maxEntryFee, setMaxEntryFee] = useState<number | null>(user?.settings.budget_max_entry || null);
  const [wheelchairFriendly, setWheelchairFriendly] = useState(user?.settings.wheelchair_friendly || false);
  const [lowIncline, setLowIncline] = useState(user?.settings.low_incline || false);
  const [filterRisky, setFilterRisky] = useState(user?.settings.safety_sensitive ?? true);

  // Header gradient animation
  const shimmer = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const toggleInterest = (id: string) =>
    setSelectedInterests(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );

  const handleLocationSelect = (location: GeoLocation) => setStartLocation(location);

  const handleContinue = async () => {
    if (!startLocation) return;
    updateSettings({
      interests: selectedInterests as any,
      budget_free_only: budgetFreeOnly,
      wheelchair_friendly: wheelchairFriendly,
      low_incline: lowIncline,
      safety_sensitive: filterRisky,
      last_start_location: { label: startLocation.label, lat: startLocation.lat, lng: startLocation.lng },
    }).catch(console.error);

    router.push({
      pathname: '/trip-settings',
      params: {
        startLat: startLocation.lat.toString(),
        startLng: startLocation.lng.toString(),
        startLabel: startLocation.label || 'Selected Location',
        interests: selectedInterests.join(','),
        timePreset, travelMode, pace,
        budgetFreeOnly: budgetFreeOnly.toString(),
        maxEntryFee: maxEntryFee?.toString() || '',
        wheelchairFriendly: wheelchairFriendly.toString(),
        filterRisky: filterRisky.toString(),
      },
    });
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      <ThemedHeader
        title={language === 'ga' ? 'Plean do Thuras' : t('planYourTrip')}
        subtitle={language === 'ga' ? 'Cuir do chuid roghanna in iúl' : 'Customize your adventure'}
        onBack={() => router.canGoBack() ? router.back() : router.replace('/')}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Location */}
        <View style={[sectionStyles.card, { marginTop: Spacing.md }]}>
          <View style={sectionStyles.header}>
            <View style={[sectionStyles.iconCircle, { backgroundColor: '#E0F2FE' }]}>
              <Ionicons name="location" size={18} color="#3B82F6" />
            </View>
            <Text style={sectionStyles.title}>{t('startLocation')}</Text>
          </View>
          <LocationPicker onLocationSelect={handleLocationSelect} initialLocation={startLocation} />
        </View>

        {/* Travel Mode */}
        <Section icon="navigate" title={t('travelMode')} iconColor="#10B981">
          <View style={styles.modeRow}>
            {TRAVEL_MODES.map(mode => {
              const active = travelMode === mode.id;
              return (
                <TouchableOpacity
                  key={mode.id}
                  style={styles.modeCard}
                  onPress={() => setTravelMode(mode.id)}
                  activeOpacity={0.8}
                >
                  {active ? (
                    <LinearGradient
                      colors={[mode.color, mode.color + 'BB']}
                      style={styles.modeCardInner}
                    >
                      <Ionicons name={mode.icon as any} size={26} color="#fff" />
                      <Text style={[styles.modeLabel, { color: '#fff' }]}>
                        {language === 'ga' ? mode.labelGa : mode.label}
                      </Text>
                    </LinearGradient>
                  ) : (
                    <View style={[styles.modeCardInner, styles.modeCardInactive]}>
                      <Ionicons name={mode.icon as any} size={26} color={mode.color} />
                      <Text style={[styles.modeLabel, { color: Colors.slate }]}>
                        {language === 'ga' ? mode.labelGa : mode.label}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </Section>

        {/* Duration */}
        <Section icon="timer-outline" title={t('duration')} iconColor="#F59E0B">
          <View style={styles.chipRow}>
            {TIME_PRESETS.map(preset => {
              const active = timePreset === preset.id;
              return (
                <TouchableOpacity
                  key={preset.id}
                  onPress={() => setTimePreset(preset.id)}
                  activeOpacity={0.8}
                >
                  {active ? (
                    <LinearGradient
                      colors={['#064E3B', '#059669']}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      style={styles.chipActive}
                    >
                      <Text style={styles.chipTextActive}>
                        {language === 'ga' ? preset.labelGa : preset.label}
                      </Text>
                    </LinearGradient>
                  ) : (
                    <View style={styles.chip}>
                      <Text style={styles.chipText}>
                        {language === 'ga' ? preset.labelGa : preset.label}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </Section>

        {/* Interests */}
        <Section icon="heart-outline" title={t('interests')} iconColor="#EC4899">
          <View style={styles.interestGrid}>
            {INTERESTS.map(interest => {
              const active = selectedInterests.includes(interest.id);
              return (
                <ScaleOnPress
                  key={interest.id}
                  onPress={() => toggleInterest(interest.id)}
                  style={{ width: '48%' }}
                >
                  <View style={[
                    styles.interestCardInner,
                    active && { borderColor: interest.color, backgroundColor: interest.color + '15' },
                  ]}>
                    <Ionicons
                      name={interest.icon as any}
                      size={22}
                      color={active ? interest.color : Colors.slate}
                    />
                    <Text style={[styles.interestLabel, active && { color: interest.color }]}>
                      {language === 'ga' ? interest.labelGa : interest.label}
                    </Text>
                    {active && (
                      <View style={[styles.interestCheck, { backgroundColor: interest.color }]}>
                        <Ionicons name="checkmark" size={10} color="#fff" />
                      </View>
                    )}
                  </View>
                </ScaleOnPress>
              );
            })}
          </View>
        </Section>

        {/* Pace */}
        <Section icon="speedometer-outline" title={t('pace')} iconColor="#8B5CF6">
          <View style={styles.modeRow}>
            {PACE_OPTIONS.map(p => {
              const active = pace === p.id;
              return (
                <TouchableOpacity
                  key={p.id}
                  style={styles.modeCard}
                  onPress={() => setPace(p.id)}
                  activeOpacity={0.8}
                >
                  {active ? (
                    <LinearGradient
                      colors={[p.color, p.color + 'BB']}
                      style={styles.modeCardInner}
                    >
                      <Ionicons name={p.icon as any} size={22} color="#fff" />
                      <Text style={[styles.modeLabel, { color: '#fff' }]}>
                        {language === 'ga' ? p.labelGa : p.label}
                      </Text>
                    </LinearGradient>
                  ) : (
                    <View style={[styles.modeCardInner, styles.modeCardInactive]}>
                      <Ionicons name={p.icon as any} size={22} color={p.color} />
                      <Text style={[styles.modeLabel, { color: Colors.slate }]}>
                        {language === 'ga' ? p.labelGa : p.label}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </Section>

        {/* Budget + Accessibility + Safety */}
        <Section icon="wallet-outline" title={t('budget')} iconColor="#10B981">
          <ToggleRow
            icon="cash-outline"
            label={t('freeOnly')}
            value={budgetFreeOnly}
            onToggle={setBudgetFreeOnly}
          />
        </Section>

        <Section icon="accessibility-outline" title={t('accessibility')} iconColor="#3B82F6">
          <ToggleRow icon="accessibility" label={t('wheelchairFriendly')} value={wheelchairFriendly} onToggle={setWheelchairFriendly} />
          <View style={styles.divider} />
          <ToggleRow icon="trending-down" label={t('lowIncline')} value={lowIncline} onToggle={setLowIncline} />
        </Section>

        <Section icon="shield-checkmark-outline" title={t('safety')} iconColor="#EF4444">
          <ToggleRow icon="shield-checkmark" label={t('filterRisky')} value={filterRisky} onToggle={setFilterRisky} />
        </Section>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* ── Bottom CTA ── */}
      <View style={styles.bottomBar}>
        <ScaleOnPress
          onPress={handleContinue}
          disabled={!startLocation}
          scaleTo={0.97}
        >
          <LinearGradient
            colors={startLocation ? ['#059669', '#047857', '#064E3B'] : ['#94A3B8', '#64748B']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.continueBtn}
          >
            <Ionicons name="eye-outline" size={22} color="#fff" />
            <Text style={styles.continueBtnText}>
              {language === 'ga' ? 'Réamhamharc Beo' : 'View Live Preview'}
            </Text>
            <Ionicons name="arrow-forward" size={22} color="rgba(255,255,255,0.8)" />
          </LinearGradient>
        </ScaleOnPress>
        {!startLocation && (
          <Text style={styles.locationHint}>
            {language === 'ga' ? '📍 Roghnaigh suíomh tosaithe' : '📍 Select a start location above'}
          </Text>
        )}
      </View>
    </View>
  );
}

// ── Toggle Row ──────────────────────────────────────────────────────────────
function ToggleRow({ icon, label, value, onToggle }: {
  icon: string; label: string; value: boolean; onToggle: (v: boolean) => void;
}) {
  return (
    <View style={toggleStyles.row}>
      <View style={toggleStyles.left}>
        <Ionicons name={icon as any} size={18} color={value ? Colors.emeraldBright : Colors.slate} />
        <Text style={[toggleStyles.label, value && { color: Colors.emeraldBright }]}>{label}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: '#E2E8F0', true: '#86EFAC' }}
        thumbColor={value ? Colors.emeraldBright : '#F1F5F9'}
        ios_backgroundColor="#E2E8F0"
      />
    </View>
  );
}

const toggleStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  left: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontSize: Typography.base, color: Colors.slate, fontWeight: '500', flexShrink: 1 },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.offWhite },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.base },

  // Mode cards
  modeRow: { flexDirection: 'row', gap: Spacing.sm },
  modeCard: { flex: 1, borderRadius: Radius.md, overflow: 'hidden' },
  modeCardInner: { alignItems: 'center', paddingVertical: Spacing.md, gap: 6 },
  modeCardInactive: { backgroundColor: Colors.offWhite, borderWidth: 1.5, borderColor: Colors.mist },
  modeLabel: { fontSize: Typography.sm, fontWeight: '600' },

  // Time chips
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: Radius.full,
    borderWidth: 1.5, borderColor: Colors.mist,
    backgroundColor: Colors.offWhite,
  },
  chipActive: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: Radius.full },
  chipText: { fontSize: Typography.sm, fontWeight: '600', color: Colors.slate },
  chipTextActive: { fontSize: Typography.sm, fontWeight: '700', color: '#fff' },

  // Interests
  interestGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  interestCardInner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.mist,
    backgroundColor: '#fff',
  },
  interestLabel: { fontSize: Typography.sm, fontWeight: '600', color: Colors.slate },
  interestCheck: {
    width: 16, height: 16, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center', marginLeft: 2,
  },

  divider: { height: 1, backgroundColor: Colors.mist, marginVertical: 8 },

  // Bottom bar
  bottomBar: {
    paddingHorizontal: Spacing.base, paddingTop: Spacing.md, paddingBottom: 36,
    backgroundColor: '#fff',
    borderTopWidth: 1, borderTopColor: Colors.mist,
    ...Shadow.lg,
  },
  continueBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 17, borderRadius: Radius.xl,
  },
  continueBtnText: { fontSize: Typography.md, fontWeight: '700', color: '#fff', flex: 1, textAlign: 'center' },
  locationHint: { textAlign: 'center', marginTop: 8, fontSize: Typography.sm, color: Colors.slate },
});
