import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, StatusBar,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../src/context/AppContext';
import { api } from '../src/services/api';
import { backgroundLocation } from '../src/services/backgroundLocation';
import { LivePreview } from '../src/types';
import { Colors, Typography, Spacing, Radius, Shadow } from '../src/theme';
import { AnimatedEntry, ThemedHeader, ThemedCard, IconCircle } from '../src/components/ui';

export default function TripSettingsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { t, language, user, setCurrentTrip } = useApp();

  const [preview, setPreview] = useState<LivePreview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  // Parse params
  const interests = (params.interests as string)?.split(',').filter(Boolean) || [];
  const timePreset = (params.timePreset as string) || '60m';
  const travelMode = (params.travelMode as string) || 'walk';
  const pace = (params.pace as string) || 'normal';
  const budgetFreeOnly = params.budgetFreeOnly === 'true';
  const wheelchairFriendly = params.wheelchairFriendly === 'true';
  const filterRisky = params.filterRisky === 'true';

  const paramLat = params.startLat ? parseFloat(params.startLat as string) : null;
  const paramLng = params.startLng ? parseFloat(params.startLng as string) : null;
  const paramLabel = (params.startLabel as string) || '';

  const lsl = user?.settings?.last_start_location;
  const startLocation = paramLat && paramLng
    ? { lat: paramLat, lng: paramLng, label: paramLabel || 'Selected Location', source: 'manual' as const }
    : lsl?.lat && lsl?.lng
      ? { lat: lsl.lat, lng: lsl.lng, label: lsl.label || 'Selected Location', source: 'manual' as const }
      : null;

  useEffect(() => {
    loadPreview();
  }, [timePreset, params.interests, pace, travelMode, budgetFreeOnly, wheelchairFriendly, filterRisky]);

  const loadPreview = async () => {
    if (!startLocation) {
      router.back();
      return;
    }
    setIsLoading(true);
    try {
      const previewData = await api.getLivePreview(
        startLocation.lat, startLocation.lng, timePreset, interests,
        budgetFreeOnly, pace, travelMode, wheelchairFriendly, filterRisky
      );
      setPreview(previewData);
    } catch (error) {
      console.error('Failed to load preview:', error);
      Alert.alert(t('error'), 'Failed to load live preview');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleNotifications = async () => {
    if (!notificationsEnabled) {
      const granted = await backgroundLocation.requestPermissions();
      if (granted) {
        await backgroundLocation.start();
        setNotificationsEnabled(true);
        Alert.alert("Notifications Enabled", "We'll let you know when you're near hidden gems!");
      } else {
        Alert.alert("Permission Denied", "Please enable location permissions in settings.");
      }
    } else {
      await backgroundLocation.stop();
      setNotificationsEnabled(false);
    }
  };

  const handleCreateTrip = async () => {
    if (!startLocation || !user) return;
    setIsCreating(true);
    try {
      const trip = await api.createTrip(user.id, {
        start_lat: startLocation.lat,
        start_lng: startLocation.lng,
        start_label: startLocation.label,
        start_source: startLocation.source,
        travel_mode: travelMode as any,
        time_preset: timePreset as any,
        interests,
        budget_free_only: budgetFreeOnly,
        accessibility_wheelchair: wheelchairFriendly,
        pace: pace as any,
      });
      setCurrentTrip(trip);
      router.replace('/active-trip');
    } catch (error: any) {
      Alert.alert(t('error'), error?.response?.data?.detail || 'Failed to create trip');
    } finally {
      setIsCreating(false);
    }
  };

  const getWeatherIcon = (conditions: string) => {
    const lower = conditions.toLowerCase();
    if (lower.includes('rain')) return 'rainy';
    if (lower.includes('cloud')) return 'cloudy';
    if (lower.includes('sun') || lower.includes('clear')) return 'sunny';
    return 'partly-sunny';
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      <ThemedHeader
        title={t('livePreview')}
        subtitle={language === 'ga' ? 'Athbhreithnigh do thuras' : 'Review your trip plan'}
        onBack={() => router.back()}
      />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.emeraldBright} />
          <Text style={styles.loadingText}>{t('loading')}</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          <AnimatedEntry delay={80}>
            <ThemedCard>
              <View style={styles.cardHeader}>
                <IconCircle icon="location" color="#3B82F6" bgColor="#EFF6FF" />
                <Text style={styles.cardTitle}>{t('startLocation')}</Text>
              </View>
              <Text style={styles.locationLabel}>{startLocation?.label}</Text>
              <LinearGradient colors={['#059669', '#047857']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.sourceBadge}>
                <Ionicons name={startLocation?.source !== 'manual' ? 'navigate' : 'pin'} size={11} color="#fff" />
                <Text style={styles.sourceBadgeText}>{startLocation?.source?.toUpperCase() || 'MANUAL'}</Text>
              </LinearGradient>
            </ThemedCard>
          </AnimatedEntry>

          {preview?.weather && (
            <AnimatedEntry delay={160}>
              <LinearGradient colors={['#0C4A6E', '#0369A1', '#0284C7']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.card, styles.weatherCardGradient]}>
                <View style={styles.cardHeader}>
                  <Ionicons name={getWeatherIcon(preview.weather.condition) as any} size={26} color={Colors.goldBright} />
                  <Text style={[styles.cardTitle, { color: '#fff' }]}>{t('weather')}</Text>
                  <Text style={styles.tempInline}>{preview.weather.temperature_c}°C</Text>
                </View>
                <Text style={styles.conditionInline}>{preview.weather.condition}</Text>
                <View style={styles.weatherGrid}>
                  <View style={styles.weatherItem}>
                    <Ionicons name="flag" size={16} color="rgba(255,255,255,0.7)" />
                    <Text style={styles.weatherValueLight}>{preview.weather.wind_speed_kmh} km/h</Text>
                    <Text style={styles.weatherLabelLight}>{t('wind')}</Text>
                  </View>
                  <View style={styles.weatherItemDivider} />
                  <View style={styles.weatherItem}>
                    <Ionicons name="water" size={16} color="rgba(255,255,255,0.7)" />
                    <Text style={styles.weatherValueLight}>{Math.round((preview.weather.precipitation_chance ?? 0) * 100)}%</Text>
                    <Text style={styles.weatherLabelLight}>{language === 'ga' ? 'Báisteach' : 'Rain'}</Text>
                  </View>
                </View>
              </LinearGradient>
            </AnimatedEntry>
          )}

          <AnimatedEntry delay={240}>
            <ThemedCard>
              <View style={styles.cardHeader}>
                <IconCircle icon="map" color={Colors.gold} bgColor="#FEF3C7" />
                <Text style={styles.cardTitle}>{language === 'ga' ? 'Achoimre Turais' : 'Trip Summary'}</Text>
              </View>
              <View style={styles.summaryGrid}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>{preview?.estimated_stops || 0}</Text>
                  <Text style={styles.summaryLabel}>{t('estimatedStops')}</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryValue, { color: Colors.gold }]}>{(preview?.estimated_stops || 0) * 100}</Text>
                  <Text style={styles.summaryLabel}>{language === 'ga' ? 'Pointí Féideartha' : 'Possible Points'}</Text>
                </View>
              </View>
            </ThemedCard>
          </AnimatedEntry>

          {preview?.estimated_stop_details && preview.estimated_stop_details.length > 0 && (
            <AnimatedEntry delay={300}>
              <ThemedCard>
                <View style={styles.cardHeader}>
                  <IconCircle icon="location" color={Colors.emeraldBright} bgColor={Colors.emeraldLight} />
                  <Text style={styles.cardTitle}>{language === 'ga' ? 'Stopanna Measta' : 'Estimated Stops'}</Text>
                </View>
                <View style={styles.stopsList}>
                  {preview.estimated_stop_details.map((stop, index) => (
                    <View key={index} style={styles.stopItem}>
                      <View style={styles.stopHeader}>
                        <LinearGradient colors={['#059669', '#047857']} style={styles.stopNumber}>
                          <Text style={styles.stopNumberText}>{index + 1}</Text>
                        </LinearGradient>
                        <View style={styles.stopInfo}>
                          <Text style={styles.stopName}>{stop.name}</Text>
                          <Text style={styles.stopCategory}>{stop.category || ''}</Text>
                        </View>
                      </View>
                      <View style={styles.stopDetails}>
                        <View style={styles.stopDetailItem}><Ionicons name="time-outline" size={14} color={Colors.slate} /><Text style={styles.stopDetailText}>~{stop.estimated_duration_min} min</Text></View>
                        <View style={styles.stopDetailItem}>
                          {stop.entry_fee > 0 ? (
                            <><Ionicons name="cash-outline" size={14} color={Colors.slate} /><Text style={styles.stopDetailText}>€{stop.entry_fee.toFixed(2)}</Text></>
                          ) : (
                            <><Ionicons name="checkmark-circle" size={14} color={Colors.emeraldBright} /><Text style={[styles.stopDetailText, { color: Colors.emeraldBright, fontWeight: '600' }]}>Free</Text></>
                          )}
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              </ThemedCard>
            </AnimatedEntry>
          )}

          <AnimatedEntry delay={360}>
            <ThemedCard>
              <View style={styles.cardHeader}>
                <IconCircle icon="settings" color="#8B5CF6" bgColor="#F5F3FF" />
                <Text style={styles.cardTitle}>{language === 'ga' ? 'Socruithe Bealaí' : 'Route Settings'}</Text>
              </View>
              <View style={styles.settingsList}>
                <View style={styles.settingRow}>
                  <Text style={styles.settingLabel}>Notifications</Text>
                  <TouchableOpacity onPress={handleToggleNotifications}>
                    <Ionicons name={notificationsEnabled ? 'notifications' : 'notifications-off'} size={22} color={notificationsEnabled ? Colors.emeraldBright : Colors.mist} />
                  </TouchableOpacity>
                </View>
                <View style={styles.settingRow}>
                  <Text style={styles.settingLabel}>{t('travelMode')}</Text>
                  <View style={styles.settingValue}>
                    <Ionicons name={travelMode === 'walk' ? 'walk' : travelMode === 'public_transport' ? 'bus' : 'car'} size={14} color={Colors.emeraldBright} />
                    <Text style={styles.settingValueText}>{t(travelMode === 'public_transport' ? 'publicTransport' : travelMode)}</Text>
                  </View>
                </View>
                <View style={styles.settingRow}>
                  <Text style={styles.settingLabel}>{t('duration')}</Text>
                  <Text style={styles.settingValueText}>{timePreset}</Text>
                </View>
                <View style={styles.settingRow}>
                  <Text style={styles.settingLabel}>{t('pace')}</Text>
                  <Text style={styles.settingValueText}>{t(pace)}</Text>
                </View>
              </View>
            </ThemedCard>
          </AnimatedEntry>

          <View style={{ height: 120 }} />
        </ScrollView>
      )}

      {!isLoading && (
        <View style={styles.bottomBar}>
          <TouchableOpacity onPress={handleCreateTrip} disabled={isCreating} activeOpacity={0.88}>
            <LinearGradient colors={isCreating ? ['#94A3B8', '#64748B'] : ['#059669', '#047857', '#064E3B']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.createBtn}>
              {isCreating ? (
                <><ActivityIndicator color="#fff" size="small" /><Text style={styles.createBtnText}>{language === 'ga' ? 'Ag cruthú...' : 'Creating your trip...'}</Text></>
              ) : (
                <><Ionicons name="rocket" size={22} color="#fff" /><Text style={styles.createBtnText}>{t('approveAndCreate')}</Text><Ionicons name="arrow-forward" size={20} color="rgba(255,255,255,0.7)" /></>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.offWhite },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: Typography.base, color: Colors.slate, marginTop: 8 },
  scrollView: { flex: 1 },
  scrollContent: { padding: Spacing.base },
  card: { backgroundColor: '#fff', borderRadius: Radius.xl, padding: Spacing.base, marginBottom: Spacing.md, ...Shadow.sm, borderWidth: 1, borderColor: '#F0FDF4' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: Spacing.md },
  cardTitle: { fontSize: Typography.md, fontWeight: '700', color: Colors.dark },
  locationLabel: { fontSize: Typography.base, color: Colors.dark, marginBottom: 10, fontWeight: '500' },
  sourceBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full },
  sourceBadgeText: { color: '#fff', fontSize: Typography.xs, fontWeight: '700', letterSpacing: 0.5 },

  weatherCardGradient: { borderWidth: 0 },
  tempInline: { marginLeft: 'auto', fontSize: Typography.xxl, fontWeight: '800', color: '#fff' },
  conditionInline: { fontSize: Typography.sm, color: 'rgba(255,255,255,0.75)', marginBottom: Spacing.md },
  weatherGrid: { flexDirection: 'row', alignItems: 'center' },
  weatherItem: { flex: 1, alignItems: 'center', gap: 3 },
  weatherItemDivider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.2)' },
  weatherValueLight: { fontSize: Typography.base, fontWeight: '700', color: '#fff' },
  weatherLabelLight: { fontSize: Typography.xs, color: 'rgba(255,255,255,0.65)' },

  summaryGrid: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  summaryDivider: { width: 1, height: 50, backgroundColor: Colors.mist },
  summaryItem: { flex: 1, alignItems: 'center', gap: 4 },
  summaryValue: { fontSize: Typography.xxl, fontWeight: '800', color: Colors.emerald },
  summaryLabel: { fontSize: Typography.xs, color: Colors.slate, textAlign: 'center', fontWeight: '500' },

  settingsList: { gap: 2 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.offWhite },
  settingLabel: { fontSize: Typography.sm, color: Colors.slate, fontWeight: '500' },
  settingValue: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  settingValueText: { fontSize: Typography.sm, fontWeight: '700', color: Colors.dark },

  stopsList: { gap: 10 },
  stopItem: { backgroundColor: Colors.offWhite, borderRadius: Radius.md, padding: 12, borderWidth: 1, borderColor: Colors.mist },
  stopHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  stopNumber: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  stopNumberText: { fontSize: Typography.sm, fontWeight: '700', color: '#fff' },
  stopInfo: { flex: 1 },
  stopName: { fontSize: Typography.base, fontWeight: '600', color: Colors.dark, marginBottom: 2 },
  stopCategory: { fontSize: Typography.xs, color: Colors.slate, textTransform: 'capitalize' },
  stopDetails: { flexDirection: 'row', gap: 16, paddingLeft: 44 },
  stopDetailItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stopDetailText: { fontSize: Typography.sm, color: Colors.slate },

  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: Spacing.base, paddingBottom: 36, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: Colors.mist, ...Shadow.lg },
  createBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 17, borderRadius: Radius.xl },
  createBtnText: { fontSize: Typography.md, fontWeight: '700', color: '#fff', flex: 1, textAlign: 'center' },
});
