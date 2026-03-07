import React, { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, Dimensions, Animated, ScrollView, StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../../src/context/AppContext';
import { Colors, Gradients, Typography, Spacing, Radius, Shadow } from '../../src/theme';
import { AnimatedEntry, PointsPill, ThemedCard, IconCircle } from '../../src/components/ui';

const { width, height } = Dimensions.get('window');

export default function TabsHomeScreen() {
  const router = useRouter();
  const { t, language, user, currentTrip } = useApp();

  // Floating shamrock animation
  const floatAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -10, duration: 2000, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.7, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const completedStops = currentTrip?.stops.filter(s => s.status === 'completed').length || 0;
  const totalStops = currentTrip?.stops.length || 0;
  const hasActiveTrip = currentTrip && currentTrip.status === 'in_progress';
  const progress = totalStops > 0 ? completedStops / totalStops : 0;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* Hero gradient background */}
      <LinearGradient
        colors={['#022C22', '#064E3B', '#065F46']}
        style={styles.heroBg}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      {/* Decorative circles */}
      <View style={styles.decorCircle1} />
      <View style={styles.decorCircle2} />

      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Hero ── */}
          <View style={styles.hero}>
            <Animated.Text
              style={[styles.shamrock, { transform: [{ translateY: floatAnim }] }]}
            >
              ☘️
            </Animated.Text>

            <AnimatedEntry delay={100}>
              <Text style={[styles.heroTitle, { fontFamily: 'PlayfairDisplay_900Black', fontSize: 36 }]}>{t('appName')}</Text>
            </AnimatedEntry>

            <AnimatedEntry delay={200}>
              <Text style={[styles.heroSubtitle, { fontStyle: 'italic', opacity: 0.9 }]}>{t('tagline')}</Text>
            </AnimatedEntry>

            {user && (
              <AnimatedEntry delay={300}>
                <LinearGradient
                  colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.08)']}
                  style={styles.welcomePill}
                >
                  <Ionicons name="person-circle" size={18} color={Colors.goldBright} />
                  <Text style={styles.welcomeText}>
                    {language === 'ga' ? 'Fáilte ar ais' : 'Welcome back'}
                  </Text>
                  <Animated.View style={{ opacity: glowAnim }}>
                    <Text style={styles.pointsBadge}>⭐ {user.total_points || 0}</Text>
                  </Animated.View>
                </LinearGradient>
              </AnimatedEntry>
            )}
          </View>

          {/* ── Stats Card ── */}
          <AnimatedEntry delay={350}>
            <ThemedCard style={styles.statsCardUnified}>
              <View style={styles.statsInner}>
                <View style={styles.statItem}>
                  <IconCircle icon="star" color={Colors.goldBright} bgColor="#FEF3C7" size={24} containerSize={44} />
                  <Text style={styles.statValueDark}>{user?.total_points || 0}</Text>
                  <Text style={styles.statLabelDark}>{t('points')}</Text>
                </View>

                <View style={styles.statDividerDark} />

                <View style={styles.statItem}>
                  <IconCircle icon="location" color="#10B981" bgColor="#ECFDF5" size={24} containerSize={44} />
                  <Text style={styles.statValueDark}>{completedStops}</Text>
                  <Text style={styles.statLabelDark}>{t('stops')}</Text>
                </View>

                <View style={styles.statDividerDark} />

                <View style={styles.statItem}>
                  <IconCircle icon="map" color="#3B82F6" bgColor="#EFF6FF" size={24} containerSize={44} />
                  <Text style={styles.statValueDark}>
                    {(user as any)?.trips_completed ?? 0}
                  </Text>
                  <Text style={styles.statLabelDark}>{t('completed')}</Text>
                </View>
              </View>
            </ThemedCard>
          </AnimatedEntry>

          {/* ── Active Trip Banner ── */}
          {hasActiveTrip && (
            <AnimatedEntry delay={400}>
              <TouchableOpacity
                onPress={() => router.push('/active-trip')}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={['#D97706', '#F59E0B', '#D97706']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.activeTripBanner}
                >
                  <View style={styles.activeTripIcon}>
                    <Ionicons name="navigate" size={22} color={Colors.emerald} />
                  </View>
                  <View style={styles.activeTripInfo}>
                    <Text style={styles.activeTripTitle}>
                      {language === 'ga' ? 'Turas ar Siúl' : 'Trip in Progress'}
                    </Text>
                    <Text style={styles.activeTripSub}>
                      {completedStops}/{totalStops} {t('stops')}
                    </Text>
                    {/* Progress bar */}
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={22} color={Colors.emerald} />
                </LinearGradient>
              </TouchableOpacity>
            </AnimatedEntry>
          )}

          {/* ── New Trip Button ── */}
          <AnimatedEntry delay={450}>
            <TouchableOpacity
              onPress={() => router.push('/onboarding')}
              activeOpacity={0.88}
              style={styles.newTripWrapper}
            >
              <LinearGradient
                colors={['#059669', '#047857', '#064E3B']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.newTripBtn}
              >
                <View style={styles.newTripIconCircle}>
                  <Ionicons name="add" size={26} color={Colors.emerald} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.newTripTitle}>
                    {language === 'ga' ? 'Turas Nua a Chruthú' : 'Start New Trip'}
                  </Text>
                  <Text style={styles.newTripSub}>
                    {language === 'ga'
                      ? 'Lig don AI do bhealach a phleanáil'
                      : 'Let AI plan your perfect route'}
                  </Text>
                </View>
                <Ionicons name="arrow-forward-circle" size={28} color="rgba(255,255,255,0.8)" />
              </LinearGradient>
            </TouchableOpacity>
          </AnimatedEntry>

          {/* ── Feature Pills ── */}
          <AnimatedEntry delay={520}>
            <View style={styles.featuresRow}>
              {[
                { icon: 'location-outline', label: language === 'ga' ? 'GPS nó Láimhe' : 'GPS or Manual', color: '#60A5FA' },
                { icon: 'chatbubble-ellipses-outline', label: language === 'ga' ? 'Cillian AI' : 'AI Chat', color: '#A78BFA' },
                { icon: 'language-outline', label: language === 'ga' ? 'Dátheangach' : 'Bilingual', color: '#34D399' },
              ].map((f, i) => (
                <View key={i} style={styles.featurePill}>
                  <LinearGradient
                    colors={['rgba(255,255,255,0.13)', 'rgba(255,255,255,0.06)']}
                    style={styles.featurePillInner}
                  >
                    <Ionicons name={f.icon as any} size={22} color={f.color} />
                    <Text style={styles.featurePillText}>{f.label}</Text>
                  </LinearGradient>
                </View>
              ))}
            </View>
          </AnimatedEntry>

          {/* ── Quick Links ── */}
          <AnimatedEntry delay={580}>
            <View style={styles.quickLinks}>
              {[
                { icon: 'trophy-outline', label: language === 'ga' ? 'Duaiseanna' : 'Rewards', route: '/(tabs)/rewards' },
                { icon: 'map-outline', label: language === 'ga' ? 'Bealaí' : 'My Trips', route: '/(tabs)/trips' },
                { icon: 'camera-outline', label: language === 'ga' ? 'Áiteanna' : 'Visited', route: '/visited-places' },
              ].map((link, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.quickLink}
                  onPress={() => router.push(link.route as any)}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.05)']}
                    style={styles.quickLinkInner}
                  >
                    <Ionicons name={link.icon as any} size={24} color={Colors.goldBright} />
                    <Text style={styles.quickLinkText}>{link.label}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>
          </AnimatedEntry>

          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#022C22' },
  safe: { flex: 1 },
  heroBg: {
    ...StyleSheet.absoluteFillObject,
    height: height * 0.55,
  },
  decorCircle1: {
    position: 'absolute', top: -80, right: -80,
    width: 280, height: 280, borderRadius: 140,
    backgroundColor: 'rgba(5,150,105,0.15)',
  },
  decorCircle2: {
    position: 'absolute', top: 120, left: -100,
    width: 220, height: 220, borderRadius: 110,
    backgroundColor: 'rgba(217,119,6,0.10)',
  },
  scroll: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.lg,
  },

  // Hero
  hero: { alignItems: 'center', paddingTop: Spacing.lg, paddingBottom: Spacing.xl },
  shamrock: { fontSize: 64, marginBottom: Spacing.sm },
  heroTitle: {
    fontSize: Typography.xxxl,
    fontWeight: '800',
    color: Colors.white,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: Typography.base,
    color: 'rgba(255,255,255,0.70)',
    textAlign: 'center',
    marginTop: 6,
    letterSpacing: 0.2,
  },
  welcomePill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: Radius.full, marginTop: Spacing.md,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
  },
  welcomeText: { color: 'rgba(255,255,255,0.85)', fontSize: Typography.sm, fontWeight: '500' },
  pointsBadge: { color: Colors.goldBright, fontSize: Typography.sm, fontWeight: '700' },

  // Stats
  statsCardUnified: { marginBottom: Spacing.md, padding: 0, overflow: 'hidden' },
  statsInner: { flexDirection: 'row', paddingVertical: Spacing.lg },
  statItem: { flex: 1, alignItems: 'center', gap: 6 },
  statDividerDark: { width: 1, height: 40, backgroundColor: Colors.mist, alignSelf: 'center' },
  statValueDark: { fontSize: Typography.xl, fontWeight: '800', color: Colors.dark },
  statLabelDark: { fontSize: Typography.xs, color: Colors.slate, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },

  // Active Trip
  activeTripBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: Spacing.base, borderRadius: Radius.lg,
    marginBottom: Spacing.md,
  },
  activeTripIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center', alignItems: 'center',
  },
  activeTripInfo: { flex: 1 },
  activeTripTitle: { fontSize: Typography.md, fontWeight: '700', color: Colors.emerald },
  activeTripSub: { fontSize: Typography.sm, color: Colors.emeraldMid, marginTop: 2 },
  progressTrack: { height: 4, backgroundColor: 'rgba(6,78,59,0.3)', borderRadius: 2, marginTop: 6 },
  progressFill: { height: 4, backgroundColor: Colors.emerald, borderRadius: 2 },

  // New Trip
  newTripWrapper: { marginBottom: Spacing.md },
  newTripBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    padding: Spacing.lg, borderRadius: Radius.xl,
    ...Shadow.lg,
  },
  newTripIconCircle: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  newTripTitle: { fontSize: Typography.md, fontWeight: '700', color: Colors.white },
  newTripSub: { fontSize: Typography.sm, color: 'rgba(255,255,255,0.7)', marginTop: 2 },

  // Features
  featuresRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  featurePill: { flex: 1, borderRadius: Radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  featurePillInner: { padding: Spacing.md, alignItems: 'center', gap: 6 },
  featurePillText: { fontSize: Typography.xs, color: 'rgba(255,255,255,0.8)', fontWeight: '600', textAlign: 'center' },

  // Quick links
  quickLinks: { flexDirection: 'row', gap: Spacing.sm },
  quickLink: { flex: 1, borderRadius: Radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  quickLinkInner: { paddingVertical: Spacing.md, alignItems: 'center', gap: 8 },
  quickLinkText: { fontSize: Typography.xs, color: 'rgba(255,255,255,0.8)', fontWeight: '600', textAlign: 'center' },
});
