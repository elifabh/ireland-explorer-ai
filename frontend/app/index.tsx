import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, SafeAreaView, Dimensions, StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../src/context/AppContext';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Gradients, Typography, Spacing, Radius, Shadow } from '../src/theme';
import { ThemedCard, IconCircle, AnimatedEntry, PrimaryButton, ScaleOnPress } from '../src/components/ui';

const { width, height } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  const { user, isLoading, t, language, setLanguage, currentTrip } = useApp();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient colors={Gradients.emerald} style={StyleSheet.absoluteFill} />
        <ActivityIndicator size="large" color={Colors.goldBright} />
        <Text style={styles.loadingText}>{t('loading')}</Text>
      </View>
    );
  }

  const handleStartJourney = () => {
    router.push('/onboarding');
  };

  const handleContinueTrip = () => {
    if (currentTrip) {
      router.push('/active-trip');
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={Gradients.emerald} style={styles.heroBackground}>
        <SafeAreaView style={styles.safeHeader}>
          <View style={styles.topRow}>
            <View style={styles.languageToggle}>
              <ScaleOnPress onPress={() => setLanguage('en')} scaleTo={0.9}>
                <View style={[styles.langBtn, language === 'en' && styles.langBtnActive]}>
                  <Text style={[styles.langText, language === 'en' && styles.langTextActive]}>EN</Text>
                </View>
              </ScaleOnPress>
              <ScaleOnPress onPress={() => setLanguage('ga')} scaleTo={0.9}>
                <View style={[styles.langBtn, language === 'ga' && styles.langBtnActive]}>
                  <Text style={[styles.langText, language === 'ga' && styles.langTextActive]}>GA</Text>
                </View>
              </ScaleOnPress>
            </View>

            <TouchableOpacity style={styles.pointsPill} onPress={() => router.push('/(tabs)/rewards')}>
              <Ionicons name="star" size={16} color={Colors.goldBright} />
              <Text style={styles.pointsText}>{user?.total_points || 0}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.heroContent}>
            <AnimatedEntry delay={200} type="fade">
              <View style={styles.logoContainer}>
                <IconCircle icon="leaf" size={40} containerSize={80} bgColor="rgba(255,255,255,0.15)" color={Colors.goldBright} />
              </View>
            </AnimatedEntry>
            <AnimatedEntry delay={400}>
              <Text style={styles.appName}>{t('appName')}</Text>

              <View style={styles.funFactBox}>
                <Ionicons name="bulb" size={16} color={Colors.goldBright} style={{ marginRight: 6 }} />
                <Text style={styles.funFactText}>
                  {language === 'ga'
                    ? 'An raibh a fhios agat? Tá deilf chónaitheach anseo a chuireann fáilte roimh na báid go minic!'
                    : 'Did you know? Ireland is home to a resident dolphin that often greets incoming boats!'}
                </Text>
              </View>

              <Text style={styles.tagline}>{language === 'ga' ? 'Treoraí Taistil Chliste' : 'Your Intelligent Travel Guide'}</Text>
            </AnimatedEntry>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.featuresRow}>
          <FeatureCard
            icon="sparkles"
            title={language === 'ga' ? 'AI-Bhunaithe' : 'AI-Powered'}
            color="#D8B4FE"
            delay={600}
          />
          <FeatureCard
            icon="trophy"
            title={language === 'ga' ? 'Duaiseanna' : 'Rewards'}
            color="#FDE68A"
            delay={700}
          />
          <FeatureCard
            icon="language"
            title={language === 'ga' ? 'Dátheangach' : 'Bilingual'}
            color="#A7F3D0"
            delay={800}
          />
        </View>

        <View style={styles.actions}>
          {currentTrip && (
            <AnimatedEntry delay={900}>
              <TouchableOpacity style={styles.continueBtn} onPress={handleContinueTrip}>
                <LinearGradient colors={['#fff', '#F1F5F9']} style={styles.continueBtnInner}>
                  <Ionicons name="play-circle" size={24} color={Colors.emeraldMid} />
                  <Text style={styles.continueBtnText}>
                    {language === 'ga' ? 'Lean ar an turas' : 'Continue Trip'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </AnimatedEntry>
          )}

          <AnimatedEntry delay={1000}>
            <PrimaryButton
              label={t('getStarted')}
              onPress={handleStartJourney}
              pulse={!currentTrip}
              icon={<Ionicons name="map" size={20} color="#fff" />}
            />
          </AnimatedEntry>
        </View>
      </View>

      {/* Quick Nav Shortcut */}
      <View style={styles.footerNav}>
        <ScaleOnPress onPress={() => router.push('/(tabs)')}>
          <View style={styles.navItem}>
            <Ionicons name="grid-outline" size={20} color={Colors.emeraldBright} />
            <Text style={styles.navLabel}>{t('home')}</Text>
          </View>
        </ScaleOnPress>
      </View>
    </View>
  );
}

function FeatureCard({ icon, title, color, delay }: { icon: string, title: string, color: string, delay: number }) {
  return (
    <AnimatedEntry delay={delay} type="fade">
      <View style={styles.featureCard}>
        <View style={[styles.featureIconWrap, { backgroundColor: color + '30' }]}>
          <Ionicons name={icon as any} size={24} color={color} />
        </View>
        <Text style={styles.featureTitle}>{title}</Text>
      </View>
    </AnimatedEntry>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.offWhite },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, fontSize: 16, color: Colors.white, fontWeight: '600' },
  heroBackground: { height: height * 0.55, maxHeight: 500, borderBottomLeftRadius: 40, borderBottomRightRadius: 40, overflow: 'hidden' },
  safeHeader: { flex: 1 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10 },
  languageToggle: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: 3 },
  langBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 18 },
  langBtnActive: { backgroundColor: Colors.white },
  langText: { fontSize: 12, fontWeight: '700', color: Colors.white },
  langTextActive: { color: Colors.emeraldMid },
  pointsPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, gap: 6 },
  pointsText: { fontSize: 16, fontWeight: '700', color: Colors.white },
  heroContent: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 40 },
  logoContainer: { marginBottom: 20, ...Shadow.md },
  appName: { fontSize: 44, fontFamily: 'PlayfairDisplay_900Black', fontWeight: '900', color: Colors.white, letterSpacing: 1, textAlign: 'center' },
  tagline: { fontSize: 17, color: 'rgba(255,255,255,0.9)', marginTop: 12, textAlign: 'center', fontWeight: '500', fontStyle: 'italic' },
  funFactBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', padding: 16, borderRadius: Radius.lg, marginTop: 24, marginHorizontal: 20 },
  funFactText: { fontSize: 14, color: Colors.white, flex: 1, fontStyle: 'italic', fontWeight: '600', lineHeight: 22 },
  content: { flex: 1, paddingHorizontal: 20, marginTop: -40 },
  featuresRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30, gap: 10 },
  featureCard: { flex: 1, backgroundColor: Colors.white, borderRadius: 20, padding: 16, alignItems: 'center', ...Shadow.sm },
  featureIconWrap: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  featureTitle: { fontSize: 11, fontWeight: '700', color: Colors.slate, textAlign: 'center' },
  actions: { gap: 15 },
  continueBtn: { borderRadius: Radius.lg, overflow: 'hidden', ...Shadow.md },
  continueBtnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 10 },
  continueBtnText: { fontSize: 17, fontWeight: '700', color: Colors.emeraldMid },
  footerNav: { paddingBottom: 30, alignItems: 'center' },
  navItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: Colors.white, borderRadius: 20, ...Shadow.sm },
  navLabel: { fontSize: 12, fontWeight: '700', color: Colors.emeraldMid },
});
