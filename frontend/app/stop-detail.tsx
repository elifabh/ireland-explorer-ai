import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Image, Alert, StatusBar, Platform
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../src/context/AppContext';
import { api } from '../src/services/api';
import { Stop, ExperiencePack } from '../src/types';
import { Colors, Typography, Shadow, Radius, Spacing } from '../src/theme';
import { AnimatedEntry, ThemedHeader, ThemedCard, IconCircle } from '../src/components/ui';

export default function StopDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { t, language, currentTrip, setCurrentTrip, refreshUser, user } = useApp();

  const tripId = params.tripId as string;
  const stopId = params.stopId as string;

  const [stop, setStop] = useState<Stop | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [amenities, setAmenities] = useState<any[]>([]);

  useEffect(() => { loadStop(); }, []);

  useEffect(() => {
    if (stop && stop.lat && stop.lng) {
      api.getNearbyAmenities(stop.lat, stop.lng).then(setAmenities).catch(() => { });
    }
  }, [stop]);

  const loadStop = async () => {
    try {
      const trip = await api.getTrip(tripId || currentTrip?.id || '');
      // Update global context so active-trip receives the update too
      if (setCurrentTrip) setCurrentTrip(trip);

      let foundStop = trip.stops.find((s: Stop) => s.id === stopId);

      // Auto-unlock via Check-In if LLM pack is missing or locked
      if (foundStop && (!foundStop.experience_pack || foundStop.experience_pack.title_en?.includes('Locked'))) {
        try {
          await api.checkIn(tripId, foundStop.id, 0, 0);
          const updatedTrip = await api.getTrip(tripId || currentTrip?.id || '');
          if (setCurrentTrip) setCurrentTrip(updatedTrip);
          foundStop = updatedTrip.stops.find((s: Stop) => s.id === stopId);
        } catch (e) {
          console.error('Silent auto check-in failed:', e);
        }
      }

      if (foundStop) setStop(foundStop);
    } catch (error) {
      console.error('Failed to load stop:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckIn = async () => {
    // Left as stub since it's now automated above on load, but just in case:
    loadStop();
  };

  const handleCompleteStop = async () => {
    if (!stop || !tripId) return;
    setImageError(null);
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        setIsUploading(true);
        await api.completeStop(tripId, stop.id, result.assets[0].base64);
        const msg = language === 'ga' ? 'Dúshlán Críochnaithe! +100 Points' : 'Challenge Completed! +100 Points';
        if (Platform.OS === 'web') alert(msg); else Alert.alert(t('success') || 'Success', msg);
        if (refreshUser) refreshUser();
        loadStop();
      }
    } catch (error: any) {
      console.error('Completion failed:', error);
      let errorMsg = error.response?.data?.detail || 'Failed to upload photo.';
      errorMsg = errorMsg.replace('AI Vision Agent: ', '');
      setImageError(errorMsg);
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient colors={['#022C22', '#064E3B']} style={StyleSheet.absoluteFillObject} />
        <ActivityIndicator size="large" color={Colors.goldBright} />
      </View>
    );
  }

  if (!stop) {
    return (
      <View style={styles.root}>
        <ThemedHeader title={t('error')} onBack={() => router.back()} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Stop not found</Text>
        </View>
      </View>
    );
  }

  const experiencePack: ExperiencePack | undefined = stop.experience_pack as ExperiencePack | undefined;
  const displayName = (language === 'ga' && stop.poi_name_ga ? stop.poi_name_ga : stop.poi_name) || 'Stop';

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      <ThemedHeader
        title={displayName}
        onBack={() => router.back()}
        rightComponent={
          <TouchableOpacity
            onPress={() => router.push({
              pathname: '/place-chat',
              params: {
                placeId: stop.poi_id,
                placeName: stop.poi_name,
                lat: stop.poi?.location.lat || stop.lat,
                lng: stop.poi?.location.lng || stop.lng,
              }
            })}
            style={styles.chatIconBtn}
          >
            <Ionicons name="chatbubbles" size={20} color={Colors.goldBright} />
          </TouchableOpacity>
        }
      />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── HERO: Cillian Chat ── */}
        <AnimatedEntry delay={100}>
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.heroChatCard}
            onPress={() => router.push({
              pathname: '/place-chat',
              params: {
                placeId: stop.poi_id,
                placeName: stop.poi_name,
                lat: stop.poi?.location.lat || stop.lat,
                lng: stop.poi?.location.lng || stop.lng,
              }
            })}
          >
            <LinearGradient
              colors={['#8B5CF6', '#6D28D9']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.heroGradient}
            >
              <View style={styles.heroContent}>
                <Text style={styles.heroTitle}>
                  {language === 'ga' ? 'Comhrá le Cillian!' : 'Chat with Cillian!'}
                </Text>
                <Text style={styles.heroSub}>
                  {language === 'ga'
                    ? 'An treoir AI is fearr leat! Cuir ceist orm...'
                    : 'Your AI Guide! Ask me secrets about this spot...'}
                </Text>
              </View>
              <View style={styles.avatarWrap}>
                <Image
                  source={{ uri: 'https://api.dicebear.com/7.x/avataaars/png?seed=Felix&backgroundColor=10B981&clothing=blazerAndSweater' }}
                  style={styles.avatar}
                />
                <View style={styles.onlineDot} />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </AnimatedEntry>

        {/* ── About Section ── */}
        <AnimatedEntry delay={200}>
          <ThemedCard>
            <View style={styles.cardHeader}>
              <IconCircle icon="information-circle" color="#2563EB" bgColor="#DBEAFE" />
              <Text style={styles.cardTitle}>{t('about') || 'The Lowdown'}</Text>
            </View>
            <Text style={[styles.bodyText, { fontSize: 16, lineHeight: 26, color: '#334155' }]}>
              {experiencePack && (!experiencePack.title_en || !experiencePack.title_en.includes('Locked'))
                ? (language === 'ga' && experiencePack.content_ga ? experiencePack.content_ga : experiencePack.content_en)
                : ((language === 'ga' && stop.poi?.description_ga ? stop.poi.description_ga : (stop.poi?.description_en || 'Cillian is currently gathering local info...')) + (language === 'ga' ? '\n\n💡 Déan seiceáil isteach chun an scéal iomlán a dhíghlasáil!' : '\n\n💡 Check-in to unlock the full historical guide and local secrets!'))
              }
            </Text>
          </ThemedCard>
        </AnimatedEntry>

        {/* ── Challenge Section ── */}
        <AnimatedEntry delay={300}>
          {!stop.completion_time ? (
            (!experiencePack || !!(experiencePack.title_en?.includes('Locked'))) ? (
              <TouchableOpacity onPress={handleCheckIn} disabled={isLoading} activeOpacity={0.85}>
                <LinearGradient colors={[Colors.goldBright, Colors.gold]} style={styles.challengeBtn}>
                  <View style={styles.challengeIconWrap}>
                    {isLoading ? <ActivityIndicator color="#fff" /> : <Ionicons name="location" size={28} color="#fff" />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.challengeTitle}>
                      {language === 'ga' ? 'Seiceáil Isteach' : 'Check In Here'}
                    </Text>
                    <Text style={styles.challengeSub}>
                      {language === 'ga' ? 'Díghlasáil scéal an mhargaidh' : 'Unlock the local experience pack!'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={22} color="rgba(255,255,255,0.6)" />
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <View>
                <TouchableOpacity onPress={handleCompleteStop} disabled={isUploading} activeOpacity={0.85}>
                  <LinearGradient colors={['#10B981', '#059669']} style={styles.challengeBtn}>
                    <View style={styles.challengeIconWrap}>
                      {isUploading ? <ActivityIndicator color="#fff" /> : <Ionicons name="camera" size={28} color="#fff" />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.challengeTitle}>
                        {language === 'ga' ? 'Críochnaigh an Dúshlán' : 'Complete Challenge'}
                      </Text>
                      <Text style={styles.challengeSub}>
                        {language === 'ga' ? 'Tóg grianghraf chun pointí a thuilleamh' : 'Take a photo to earn 100 points!'}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={22} color="rgba(255,255,255,0.6)" />
                  </LinearGradient>
                </TouchableOpacity>
                {imageError && (
                  <View style={{ marginTop: 12, backgroundColor: '#FEF2F2', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#FECACA', flexDirection: 'row', alignItems: 'flex-start' }}>
                    <Ionicons name="alert-circle" size={24} color="#EF4444" style={{ marginRight: 8, marginTop: -2 }} />
                    <Text style={{ flex: 1, color: '#B91C1C', fontSize: 13, lineHeight: 18, fontWeight: '500' }}>
                      {imageError}
                    </Text>
                  </View>
                )}
              </View>
            )
          ) : (
            <ThemedCard style={styles.completedCard}>
              <View style={styles.cardHeader}>
                <IconCircle icon="checkmark-circle" color="#10B981" bgColor="#D1FAE5" />
                <Text style={styles.cardTitle}>{t('completed') || 'Challenge Completed!'}</Text>
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedText}>VERIFIED</Text>
                </View>
              </View>
              {!!stop.completion_time && (
                <View style={styles.photoFrame}>
                  <LinearGradient colors={['#D1FAE5', '#A7F3D0']} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <Ionicons name="images" size={48} color="#059669" />
                    <Text style={{ marginTop: 12, color: '#047857', fontWeight: '600' }}>
                      {language === 'ga' ? 'Grianghraf Sábháilte' : 'Photo Uploaded & Saved'}
                    </Text>
                  </LinearGradient>
                </View>
              )}
              <Text style={styles.completedText}>
                {language === 'ga' ? 'Maith thú! +100 pointe' : 'Great shot! +100 points earned.'}
              </Text>
            </ThemedCard>
          )}
        </AnimatedEntry>

        {/* ── Fun Facts ── */}
        {!!(experiencePack?.fun_facts?.length) && (
          <AnimatedEntry delay={400}>
            <ThemedCard>
              <View style={styles.cardHeader}>
                <IconCircle icon="bulb" color="#D97706" bgColor="#FEF3C7" />
                <Text style={styles.cardTitle}>{t('funFacts') || 'Hidden Secrets'}</Text>
              </View>
              {(language === 'ga' && experiencePack.fun_facts_ga
                ? experiencePack.fun_facts_ga
                : experiencePack.fun_facts
              ).map((fact, index) => (
                <View key={index} style={styles.factRow}>
                  <View style={styles.factDot} />
                  <Text style={styles.factText}>
                    {typeof fact === 'string' ? fact : (language === 'ga' && fact.ga ? fact.ga : fact.en)}
                  </Text>
                </View>
              ))}
            </ThemedCard>
          </AnimatedEntry>
        )}

        {/* ── Nearby Amenities ── */}
        {amenities.length > 0 && (
          <AnimatedEntry delay={450}>
            <ThemedCard style={{ backgroundColor: '#F0F9FF', borderColor: '#BAE6FD' }}>
              <View style={styles.cardHeader}>
                <IconCircle icon="restaurant" color="#0369A1" bgColor="#E0F2FE" />
                <Text style={[styles.cardTitle, { color: '#0369A1' }]}>
                  {language === 'ga' ? 'Bialanna agus Lóistín' : 'Local Eats & Stays'}
                </Text>
              </View>
              {amenities.map((item, idx) => (
                <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, backgroundColor: '#fff', padding: 12, borderRadius: 12, ...Shadow.sm }}>
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#E0F2FE', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                    <Ionicons name={item.type.includes('hotel') || item.type.includes('guest') ? 'bed' : 'restaurant'} size={18} color="#0284C7" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A' }}>{item.name}</Text>
                    <Text style={{ fontSize: 12, color: '#64748B', textTransform: 'capitalize' }}>
                      {item.type.replace('_', ' ')}
                      {item.cuisine ? ` • ${item.cuisine.replace(';', ', ')}` : ''}
                    </Text>
                  </View>
                </View>
              ))}
            </ThemedCard>
          </AnimatedEntry>
        )}

        {/* ── Secondary Actions ── */}
        <AnimatedEntry delay={500}>
          <Text style={styles.sectionLabel}>{t('actions') || 'More Actions'}</Text>

          <TouchableOpacity
            style={[styles.smallActionBtn, { marginBottom: 16 }]}
            activeOpacity={0.8}
            onPress={async () => {
              const uId = user?.id || currentTrip?.user_id;
              console.log('MARK VISITED CALLED. userId=', uId, 'stopId=', stop.poi_id || stop.id);
              if (uId) {
                try {
                  const payload = {
                    place_id: stop.poi_id || stop.id || 'unknown',
                    name: stop.poi_name || 'Stop',
                    lat: stop.poi?.location?.lat || stop.lat || 0,
                    lng: stop.poi?.location?.lng || stop.lng || 0,
                    trip_id: tripId,
                    stop_id: stop.id
                  };
                  console.log('SENDING PAYLOAD:', payload);
                  await api.addVisitedPlace(uId, payload);
                  console.log('SUCCESS API');

                  if (Platform.OS === 'web') { alert('Success: Marked as visited!'); }
                  else { Alert.alert('Success', 'Marked as visited!'); }

                  loadStop(); // Refresh local and global trip context

                } catch (e: any) {
                  const d = e.response?.data?.detail;
                  const errMessage = typeof d === 'string' ? d : JSON.stringify(d || e.message || 'Failed to mark visited');
                  console.error('Visited Error Catch:', errMessage, e);

                  if (Platform.OS === 'web') { alert('Error: ' + errMessage); }
                  else { Alert.alert('Error', errMessage); }
                }
              } else {
                console.warn('USER ID NOT FOUND');
                if (Platform.OS === 'web') { alert('Error: User info missing, please reload.'); }
                else { Alert.alert('Error', 'User info missing, please reload.'); }
              }
            }}
          >
            <LinearGradient colors={['#F1F5F9', '#E2E8F0']} style={[styles.smallActionBg, { borderColor: '#CBD5E1', borderWidth: 1 }]}>
              <Ionicons name="flag" size={20} color="#334155" />
              <Text style={[styles.smallActionText, { color: '#334155' }]}>{t('markVisited') || 'Mark as Visited Yourself'}</Text>
            </LinearGradient>
          </TouchableOpacity>

          <View style={{ backgroundColor: '#FEF2F2', borderRadius: Radius.xl, padding: 16, borderWidth: 1, borderColor: '#FECACA' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <Ionicons name="heart-half" size={24} color="#EF4444" />
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#991B1B', flex: 1 }}>
                {language === 'ga' ? 'Cuidigh Linn' : 'Be a Guardian'}
              </Text>
            </View>
            <Text style={{ fontSize: 14, color: '#7F1D1D', marginBottom: 16, lineHeight: 22, fontWeight: '500' }}>
              {language === 'ga'
                ? 'An bhfaca tú damáiste do na hiarsmaí seo? Déan tuairisc chun an stair a chosaint thar ceann na nglún atá le teacht.'
                : "Ireland’s ancient stones, vibrant coastlines, and historic ruins are fragile. As an Explorer, you play a direct role in preserving them. \n\nIf you spot vandalism, dangerous erosion, or structural damage, report it here. Your active guardianship is directly routed to local protection authorities (such as the National Monument Service). Ensure our history survives! Thank you for caring."}
            </Text>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push({
                pathname: '/report-damage',
                params: {
                  poiId: stop.poi_id,
                  poiName: stop.poi_name || 'Stop',
                  lat: stop.poi?.location.lat || stop.lat || 0,
                  lng: stop.poi?.location.lng || stop.lng || 0
                }
              })}
            >
              <View style={[styles.smallActionBtn, { ...Shadow.md }]}>
                <LinearGradient colors={['#EF4444', '#DC2626']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.smallActionBg, { paddingVertical: 16 }]}>
                  <Ionicons name="shield-checkmark" size={22} color="#fff" />
                  <Text style={[styles.smallActionText, { fontSize: 15, letterSpacing: 0.5 }]}>
                    {t('reportDamage') || 'Report Damage Now'}
                  </Text>
                </LinearGradient>
              </View>
            </TouchableOpacity>
          </View>
        </AnimatedEntry>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.offWhite },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText: { fontSize: 16, color: Colors.slate, fontWeight: '600' },

  chatIconBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },

  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.base, gap: 16 },

  // Hero Chat
  heroChatCard: { borderRadius: Radius.xl, overflow: 'hidden', ...Shadow.lg },
  heroGradient: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 16 },
  heroContent: { flex: 1 },
  heroTitle: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 4 },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: '500', lineHeight: 18 },
  avatarWrap: { position: 'relative' },
  avatar: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: '#fff' },
  onlineDot: {
    position: 'absolute', bottom: 2, right: 2,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: '#10B981', borderWidth: 2, borderColor: '#fff',
  },

  // Shared Card Header
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  cardTitle: { fontSize: Typography.base, fontWeight: '800', color: Colors.dark },
  bodyText: { fontSize: 15, lineHeight: 22, color: Colors.slate, fontWeight: '500' },

  // Challenge
  challengeBtn: {
    flexDirection: 'row', alignItems: 'center', padding: 18,
    borderRadius: Radius.xl, gap: 16, ...Shadow.md,
  },
  challengeIconWrap: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  challengeTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  challengeSub: { fontSize: 12, color: '#D1FAE5', fontWeight: '600' },

  completedCard: { borderColor: '#10B981', backgroundColor: '#F0FDF4' },
  verifiedBadge: { backgroundColor: '#10B981', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginLeft: 'auto' },
  verifiedText: { fontSize: 9, fontWeight: '900', color: '#fff' },
  photoFrame: { borderRadius: Radius.lg, overflow: 'hidden', height: 200, marginVertical: 12, borderWidth: 3, borderColor: '#fff' },
  completionPhoto: { width: '100%', height: '100%' },
  completedText: { fontSize: 14, fontWeight: '700', color: Colors.emerald, textAlign: 'center' },

  // Facts
  factRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  factDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.goldBright, marginTop: 8 },
  factText: { flex: 1, fontSize: 14, color: Colors.slate, lineHeight: 20, fontWeight: '500' },

  // Secondary
  sectionLabel: { fontSize: 11, fontWeight: '800', color: Colors.slate, textTransform: 'uppercase', letterSpacing: 1, marginLeft: 4, marginBottom: 8 },
  gridActions: { flexDirection: 'row', gap: 12 },
  smallActionBtn: { flex: 1, borderRadius: Radius.lg, overflow: 'hidden', ...Shadow.sm },
  smallActionBg: { paddingVertical: 14, alignItems: 'center', justifyContent: 'center', gap: 6 },
  smallActionText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  damageHint: { fontSize: 11, color: Colors.slate, textAlign: 'center', marginTop: 8, fontStyle: 'italic' },
});
