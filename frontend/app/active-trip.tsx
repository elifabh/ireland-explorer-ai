import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Animated, StatusBar,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../src/context/AppContext';
import { api } from '../src/services/api';
import { Stop } from '../src/types';
import { Colors, Typography, Spacing, Radius, Shadow } from '../src/theme';
import { AnimatedEntry, ThemedHeader, ThemedCard, IconCircle } from '../src/components/ui';

export default function ActiveTripScreen() {
  const router = useRouter();
  const { t, language, currentTrip, setCurrentTrip, user, refreshUser } = useApp();

  const [isLoading, setIsLoading] = React.useState(false);
  const [checkingIn, setCheckingIn] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState<string | null>(null);
  const [userLocation, setUserLocation] = React.useState<{ lat: number; lng: number } | null>(null);

  const progressAnim = useRef(new Animated.Value(0)).current;

  const completedCount = currentTrip?.stops.filter(s => s.status === 'completed').length ?? 0;
  const totalStops = currentTrip?.stops.length ?? 0;
  const progress = totalStops > 0 ? (completedCount / totalStops) * 100 : 0;

  useFocusEffect(
    React.useCallback(() => {
      if (!currentTrip) { router.replace('/'); return; }
      getUserLocation();
      refreshTrip();
    }, [currentTrip?.id])
  );

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress, duration: 700, useNativeDriver: false,
    }).start();
  }, [progress]);

  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setUserLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      }
    } catch (e) { console.error('Location error:', e); }
  };

  const refreshTrip = async () => {
    if (!currentTrip) return;
    try {
      const updated = await api.getTrip(currentTrip.id);
      setCurrentTrip(updated);
    } catch (e) { console.error('Failed to refresh trip:', e); }
  };

  const handleCheckIn = async (stop: Stop) => {
    if (!currentTrip || !userLocation) {
      Alert.alert(t('error'), language === 'ga' ? 'Cuir cead suímh ar fáil le do thoil' : 'Please enable location permissions');
      return;
    }
    setCheckingIn(stop.id);
    try {
      const result = await api.checkIn(currentTrip.id, stop.id, userLocation.lat, userLocation.lng);
      if (result.success) {
        Alert.alert(t('success'), t('checkInSuccess') + '\n' + t('photoRequired'));
        await refreshTrip();
      }
    } catch (error: any) {
      Alert.alert(t('error'), error.response?.data?.detail || t('tooFarFromStop'));
    } finally {
      setCheckingIn(null);
    }
  };

  const handleUploadPhoto = async (stop: Stop) => {
    if (!currentTrip) return;
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('error'), language === 'ga' ? 'Tá cead ceamara ag teastáil' : 'Camera permission is required');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7, base64: true, allowsEditing: true, aspect: [4, 3] });
    if (result.canceled || !result.assets[0].base64) return;
    setUploading(stop.id);
    try {
      const completeResult = await api.completeStop(currentTrip.id, stop.id, result.assets[0].base64);
      if (completeResult.success) {
        Alert.alert(t('success'), completeResult.trip_completed ? t('tripComplete') : `+${completeResult.points_awarded} ${t('points')}!`);
        await refreshTrip();
        await refreshUser();
        if (completeResult.trip_completed) { router.replace('/(tabs)/trips'); }
      }
    } catch (error: any) {
      Alert.alert(t('error'), error.response?.data?.detail || 'Failed to complete stop');
    } finally {
      setUploading(null);
    }
  };

  const handleViewDetails = (stop: Stop) => {
    router.push({ pathname: '/stop-detail', params: { tripId: currentTrip?.id, stopId: stop.id } });
  };

  if (!currentTrip) {
    return (
      <View style={styles.loadingScreen}>
        <LinearGradient colors={['#022C22', '#064E3B']} style={StyleSheet.absoluteFillObject} />
        <ActivityIndicator size="large" color={Colors.goldBright} />
      </View>
    );
  }

  const earned = currentTrip.total_points || currentTrip.points_earned || 0;
  const possible = currentTrip.total_points_possible || 0;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      <ThemedHeader
        title={t('activeTrip')}
        subtitle={language === 'ga' ? 'Turas i mbun ☘️' : 'Trip in Progress ☘️'}
        onBack={() => router.back()}
        rightComponent={
          <TouchableOpacity style={styles.headerIconBtn} onPress={refreshTrip}>
            <Ionicons name="refresh" size={18} color={Colors.goldBright} />
          </TouchableOpacity>
        }
      />

      <View style={styles.headerExtra}>
        <View style={styles.progressWrap}>
          <View style={styles.progressMeta}>
            <Text style={styles.progressLabel}>{completedCount}/{totalStops} {t('stops')}</Text>
            <Text style={styles.pointsBadge}>⭐ {earned}/{possible} pts</Text>
          </View>
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, { width: progressAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) }]} />
          </View>
        </View>
      </View>

      <View style={styles.startBar}>
        <IconCircle icon="flag" color={Colors.emeraldBright} bgColor="#fff" containerSize={28} size={14} />
        <View style={{ flex: 1 }}>
          <Text style={styles.startSmall}>{language === 'ga' ? 'Tús' : 'Start'}</Text>
          <Text style={styles.startName} numberOfLines={1}>
            {currentTrip.start_label || `${(currentTrip as any).start_location?.lat?.toFixed(4) || 0}, ${(currentTrip as any).start_location?.lng?.toFixed(4) || 0}`}
          </Text>
        </View>
        <LinearGradient colors={['#059669', '#047857']} style={styles.sourceChip}>
          <Text style={styles.sourceChipText}>{currentTrip.start_source?.toUpperCase()}</Text>
        </LinearGradient>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {currentTrip?.warnings && currentTrip.warnings.length > 0 && (
          <AnimatedEntry delay={10}>
            <View style={{ backgroundColor: '#FEF2F2', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#FECACA', marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <Ionicons name="warning" size={16} color="#DC2626" />
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#DC2626', marginLeft: 6 }}>
                  {language === 'ga' ? 'Nóta ón AI' : 'Agent Note'}
                </Text>
              </View>
              {currentTrip.warnings.map((w, i) => (
                <Text key={i} style={{ fontSize: 13, color: '#7F1D1D', marginTop: 2, lineHeight: 18 }}>• {w}</Text>
              ))}
            </View>
          </AnimatedEntry>
        )}

        {currentTrip.stops.map((stop, index) => {
          const isCompleted = stop.status === 'completed';
          const isAvailable = stop.status === 'available';
          const isLocked = !isCompleted && !isAvailable;
          const isClosed = stop.is_currently_open === false;
          const prevCompleted = index > 0 && currentTrip.stops[index - 1].status === 'completed';

          return (
            <AnimatedEntry key={stop.id} delay={index * 80}>
              {index > 0 && <View style={styles.lineWrap}><View style={[styles.line, prevCompleted && styles.lineCompleted]} /></View>}
              <View style={[styles.stopCard, isCompleted && styles.stopCardCompleted, isAvailable && !isClosed && styles.stopCardAvailable, isAvailable && isClosed && styles.stopCardClosed, isLocked && styles.stopCardLocked]}>
                <View style={styles.nodeLeft}>
                  <LinearGradient colors={isCompleted ? ['#10B981', '#059669'] : isClosed ? ['#F87171', '#EF4444'] : isAvailable ? [Colors.goldBright, Colors.gold] : ['#CBD5E1', '#94A3B8']} style={styles.nodeCircle}>
                    <Ionicons name={isCompleted ? 'checkmark-circle' : isClosed ? 'time' : isAvailable ? 'location' : 'lock-closed'} size={22} color="#fff" />
                  </LinearGradient>
                  <Text style={styles.stopIndex}>{index + 1}</Text>
                </View>
                <TouchableOpacity style={styles.stopInfo} onPress={() => handleViewDetails(stop)} activeOpacity={0.7}>
                  <Text style={styles.stopLabel} numberOfLines={2}>{language === 'ga' && stop.poi_name_ga ? stop.poi_name_ga : stop.poi_name}</Text>

                  {stop.poi?.opening_hours && (
                    <View style={styles.hoursRow}>
                      <Ionicons name="time-outline" size={12} color={isClosed ? '#EF4444' : Colors.slate} />
                      <Text style={[styles.hoursText, isClosed && { color: '#EF4444', fontWeight: '700' }]}>
                        {stop.poi.opening_hours} {isClosed ? (language === 'ga' ? '(Dúnta)' : '(Closed)') : ''}
                      </Text>
                    </View>
                  )}

                  <View style={styles.stopPointsRow}>
                    <Ionicons name="star" size={12} color={Colors.goldBright} />
                    <Text style={styles.stopPoints}>{isCompleted ? `+${stop.points_awarded}` : '100'} {t('points')}</Text>
                  </View>
                </TouchableOpacity>
                <View style={styles.actionsCol}>
                  {isAvailable && (!stop.experience_pack || stop.experience_pack.title_en?.includes('Locked')) && (
                    <TouchableOpacity onPress={() => handleCheckIn(stop)} disabled={checkingIn === stop.id} activeOpacity={0.85}>
                      <LinearGradient colors={[Colors.goldBright, Colors.gold]} style={styles.actionBtn}>
                        {checkingIn === stop.id ? <ActivityIndicator size="small" color="#fff" /> : <><Ionicons name="location" size={14} color="#fff" /><Text style={styles.actionBtnText}>{t('checkIn')}</Text></>}
                      </LinearGradient>
                    </TouchableOpacity>
                  )}
                  {isAvailable && (stop.experience_pack && !stop.experience_pack.title_en?.includes('Locked')) && (
                    <TouchableOpacity onPress={() => handleUploadPhoto(stop)} disabled={uploading === stop.id} activeOpacity={0.85}>
                      <LinearGradient colors={['#059669', '#047857']} style={styles.actionBtn}>
                        {uploading === stop.id ? <ActivityIndicator size="small" color="#fff" /> : <><Ionicons name="camera" size={14} color="#fff" /><Text style={styles.actionBtnText}>{t('uploadPhoto')}</Text></>}
                      </LinearGradient>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={styles.detailsBtn} onPress={() => handleViewDetails(stop)}>
                    <Ionicons name="information-circle" size={22} color={Colors.emeraldBright} />
                  </TouchableOpacity>
                </View>
              </View>
            </AnimatedEntry>
          );
        })}

        <View style={styles.lineWrap}><View style={[styles.line, completedCount === totalStops && styles.lineCompleted]} /></View>
        <ThemedCard style={[styles.finishCard, completedCount === totalStops && styles.finishCardActive]}>
          <LinearGradient colors={completedCount === totalStops ? ['#059669', '#064E3B'] : ['#F8FAFC', '#F1F5F9']} style={styles.finishGradient}>
            <Text style={styles.finishEmoji}>{completedCount === totalStops ? '🏆' : '🏁'}</Text>
            <Text style={[styles.finishTitle, completedCount !== totalStops && { color: Colors.slate }]}>
              {completedCount === totalStops ? (language === 'ga' ? 'Comhghairdeachas!' : 'Congratulations!') : (language === 'ga' ? 'Críochnaigh an Turas' : 'Finish Line')}
            </Text>
          </LinearGradient>
        </ThemedCard>
        <View style={{ height: 50 }} />
      </ScrollView>
    </View >
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.offWhite },
  loadingScreen: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerIconBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  headerExtra: { backgroundColor: '#065F46', paddingBottom: Spacing.base },
  progressWrap: { paddingHorizontal: Spacing.base },
  progressMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel: { fontSize: Typography.sm, fontWeight: '600', color: 'rgba(255,255,255,0.9)' },
  pointsBadge: { fontSize: Typography.sm, fontWeight: '700', color: Colors.goldBright },
  progressTrack: { height: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.goldBright, borderRadius: 4 },

  startBar: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.emeraldLight, marginHorizontal: Spacing.base, marginTop: Spacing.md, padding: 12, borderRadius: Radius.md, borderWidth: 1, borderColor: '#A7F3D0' },
  startSmall: { fontSize: Typography.xs, color: Colors.emerald, fontWeight: '600' },
  startName: { fontSize: Typography.sm, fontWeight: '700', color: Colors.emerald },
  sourceChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.full },
  sourceChipText: { fontSize: 10, fontWeight: '700', color: '#fff', letterSpacing: 0.5 },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.base, paddingTop: Spacing.md },
  lineWrap: { alignItems: 'center', height: 24 },
  line: { width: 3, height: '100%', backgroundColor: Colors.mist, borderRadius: 2 },
  lineCompleted: { backgroundColor: Colors.emeraldBright },

  stopCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: Radius.xl, padding: 14, gap: 12, borderWidth: 1, borderColor: Colors.mist, ...Shadow.md },
  stopCardCompleted: { borderColor: '#86EFAC', backgroundColor: '#F0FDF4' },
  stopCardAvailable: { borderColor: Colors.goldBright, backgroundColor: '#FFFBEB' },
  stopCardClosed: { borderColor: '#FECACA', backgroundColor: '#FEF2F2' },
  stopCardLocked: { opacity: 0.65 },
  nodeLeft: { alignItems: 'center', gap: 4 },
  nodeCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', ...Shadow.sm },
  stopIndex: { fontSize: 10, fontWeight: '700', color: Colors.slate },
  stopInfo: { flex: 1 },
  stopLabel: { fontSize: Typography.base, fontWeight: '700', color: Colors.dark, marginBottom: 4 },
  hoursRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  hoursText: { fontSize: 12, color: Colors.slate },
  stopPointsRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stopPoints: { fontSize: Typography.xs, color: Colors.gold, fontWeight: '600' },
  actionsCol: { alignItems: 'flex-end', gap: 6 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 8, borderRadius: Radius.md },
  actionBtnText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  detailsBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.emeraldLight, justifyContent: 'center', alignItems: 'center' },

  finishCard: { padding: 0, overflow: 'hidden' },
  finishCardActive: { borderColor: Colors.emeraldBright },
  finishGradient: { alignItems: 'center', paddingVertical: 24, gap: 6 },
  finishEmoji: { fontSize: 36 },
  finishTitle: { fontSize: Typography.lg, fontWeight: '800', color: '#fff' },
});
