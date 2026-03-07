import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  SafeAreaView, ActivityIndicator, StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../../src/context/AppContext';
import { api } from '../../src/services/api';
import { Trip } from '../../src/types';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../src/theme';
import { AnimatedEntry, ThemedHeader } from '../../src/components/ui';

export default function TripsScreen() {
  const router = useRouter();
  const { t, language, user, setCurrentTrip } = useApp();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { loadTrips(); }, [user]);

  const loadTrips = async () => {
    if (!user) return;
    try {
      const userTrips = await api.getUserTrips(user.id);
      setTrips(userTrips.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ));
    } catch (e) { console.error('Failed to load trips:', e); }
    finally { setIsLoading(false); }
  };

  const handleTripPress = (trip: Trip) => {
    setCurrentTrip(trip);
    router.push('/active-trip');
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'completed': return { colors: ['#059669', '#047857'] as [string, string], label: language === 'ga' ? 'Críochnaithe' : 'Completed', icon: 'checkmark-circle' };
      case 'in_progress': return { colors: [Colors.goldBright, Colors.gold] as [string, string], label: language === 'ga' ? 'Gníomhach' : 'In Progress', icon: 'navigate-circle' };
      default: return { colors: ['#64748B', '#475569'] as [string, string], label: language === 'ga' ? 'Dreach' : 'Draft', icon: 'time' };
    }
  };

  const renderTrip = ({ item, index }: { item: Trip; index: number }) => {
    const completedStops = item.stops.filter(s => s.status === 'completed').length;
    const progress = item.stops.length > 0 ? (completedStops / item.stops.length) * 100 : 0;
    const cfg = getStatusConfig(item.status);

    return (
      <AnimatedEntry delay={index * 80}>
        <TouchableOpacity
          style={styles.tripCard}
          onPress={() => handleTripPress(item)}
          activeOpacity={0.88}
        >
          {/* Status + date row */}
          <View style={styles.cardTop}>
            <LinearGradient colors={cfg.colors} style={styles.statusBadge}>
              <Ionicons name={cfg.icon as any} size={12} color="#fff" />
              <Text style={styles.statusText}>{cfg.label}</Text>
            </LinearGradient>
            <Text style={styles.dateText}>
              {new Date(item.created_at).toLocaleDateString('en-IE', { day: 'numeric', month: 'short' })}
            </Text>
          </View>

          {/* Location */}
          <View style={styles.locationRow}>
            <View style={styles.locationDot}>
              <Ionicons name="location" size={14} color={Colors.emeraldBright} />
            </View>
            <Text style={styles.locationText} numberOfLines={1}>
              {item.start_label || `${item.start_location?.lat?.toFixed(3) ?? '?'}, ${item.start_location?.lng?.toFixed(3) ?? '?'}`}
            </Text>
          </View>

          {/* Meta chips */}
          <View style={styles.metaRow}>
            <View style={styles.metaChip}>
              <Ionicons name="flag" size={12} color={Colors.slate} />
              <Text style={styles.metaText}>{completedStops}/{item.stops.length} stops</Text>
            </View>
            <View style={[styles.metaChip, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="star" size={12} color={Colors.goldBright} />
              <Text style={[styles.metaText, { color: Colors.gold }]}>{item.points_earned ?? 0} pts</Text>
            </View>
            <View style={styles.metaChip}>
              <Ionicons name="time" size={12} color={Colors.slate} />
              <Text style={styles.metaText}>{item.time_preset}</Text>
            </View>
          </View>

          {/* Progress */}
          <View style={styles.progressTrack}>
            <LinearGradient
              colors={cfg.colors}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={[styles.progressFill, { width: `${Math.max(progress, progress > 0 ? 4 : 0)}%` as any }]}
            />
          </View>
          <Text style={styles.progressPercent}>{Math.round(progress)}% complete</Text>
        </TouchableOpacity>
      </AnimatedEntry>
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <ThemedHeader
        title={t('trips')}
        subtitle={`${trips.length} ${language === 'ga' ? 'turas' : trips.length === 1 ? 'trip' : 'trips'}`}
        rightComponent={
          <TouchableOpacity style={styles.headerIconBtn} onPress={loadTrips}>
            <Ionicons name="refresh" size={18} color={Colors.goldBright} />
          </TouchableOpacity>
        }
      />

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={Colors.emeraldBright} />
        </View>
      ) : trips.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyEmoji}>🗺️</Text>
          <Text style={styles.emptyTitle}>{t('noTrips')}</Text>
          <Text style={styles.emptySub}>
            {language === 'ga' ? 'Cruthaigh do chéad turas!' : 'Create your first adventure!'}
          </Text>
          <TouchableOpacity onPress={() => router.push('/onboarding')} activeOpacity={0.88}>
            <LinearGradient
              colors={['#059669', '#064E3B']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.newTripBtn}
            >
              <Ionicons name="add-circle" size={20} color="#fff" />
              <Text style={styles.newTripBtnText}>{language === 'ga' ? 'Turas Nua' : 'New Trip'}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={trips}
          renderItem={renderTrip}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.offWhite },
  headerIconBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },

  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 32 },
  emptyEmoji: { fontSize: 64 },
  emptyTitle: { fontSize: Typography.lg, fontWeight: '700', color: Colors.dark, textAlign: 'center' },
  emptySub: { fontSize: Typography.base, color: Colors.slate, textAlign: 'center' },
  newTripBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 28, paddingVertical: 14, borderRadius: Radius.xl, marginTop: 8,
  },
  newTripBtnText: { color: '#fff', fontSize: Typography.base, fontWeight: '700' },

  listContent: { padding: Spacing.base },
  tripCard: {
    backgroundColor: '#fff', borderRadius: Radius.xl,
    padding: Spacing.base, marginBottom: 12,
    ...Shadow.md, borderWidth: 1, borderColor: '#F0FDF4',
  },

  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full,
  },
  statusText: { fontSize: Typography.xs, fontWeight: '700', color: '#fff' },
  dateText: { fontSize: Typography.xs, color: Colors.slate, fontWeight: '500' },

  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  locationDot: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: Colors.emeraldLight,
    justifyContent: 'center', alignItems: 'center',
  },
  locationText: { flex: 1, fontSize: Typography.base, fontWeight: '600', color: Colors.dark },

  metaRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  metaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.offWhite, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
  },
  metaText: { fontSize: Typography.xs, color: Colors.slate, fontWeight: '600' },

  progressTrack: {
    height: 6, backgroundColor: Colors.mist, borderRadius: 3, overflow: 'hidden', marginBottom: 4,
  },
  progressFill: { height: '100%', borderRadius: 3 },
  progressPercent: { fontSize: 10, color: Colors.slate, fontWeight: '500', textAlign: 'right' },
});
