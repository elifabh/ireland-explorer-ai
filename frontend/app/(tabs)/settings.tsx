import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, StatusBar, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../src/context/AppContext';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../src/theme';
import { AnimatedEntry, ThemedHeader, IconCircle, ThemedCard, ScaleOnPress } from '../../src/components/ui';

export default function SettingsScreen() {
  const { t, language, setLanguage, user, updateSettings } = useApp();

  const handleToggle = async (key: string, value: boolean) => {
    await updateSettings({ [key]: value });
  };

  const SettingRow = ({ icon, label, value, onToggle, color = Colors.slate }: any) => (
    <View style={styles.settingRow}>
      <View style={styles.settingInfo}>
        <IconCircle icon={icon} color={color} bgColor={`${color}15`} containerSize={32} size={18} />
        <Text style={styles.settingLabel}>{label}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: '#CBD5E1', true: '#6EE7B7' }}
        thumbColor={value ? Colors.emeraldBright : '#F8FAFC'}
        ios_backgroundColor="#CBD5E1"
      />
    </View>
  );

  const InfoRow = ({ label, value, icon }: any) => (
    <View style={styles.infoRow}>
      <View style={styles.infoLabelGroup}>
        {icon && <Ionicons name={icon} size={16} color={Colors.slate} style={{ marginRight: 8 }} />}
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
    </View>
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      <ThemedHeader
        title={t('settings')}
        subtitle={language === 'ga' ? 'Socruithe & Próifíl ⚙️' : 'Preferences & Profile ⚙️'}
      />

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* ── Language Section ── */}
        <AnimatedEntry delay={100}>
          <ThemedCard style={styles.section}>
            <Text style={styles.sectionTitle}>{t('selectLanguage')}</Text>
            <View style={styles.languageGrid}>
              <ScaleOnPress
                onPress={() => setLanguage('en')}
                disabled={language === 'en'}
                style={{ flex: 1 }}
              >
                <View style={[styles.langCard, language === 'en' && styles.langCardActive]}>
                  <Text style={styles.flag}>🇬🇧</Text>
                  <Text style={[styles.langText, language === 'en' && styles.langTextActive]}>{t('english')}</Text>
                  {language === 'en' && <Ionicons name="checkmark-circle" size={18} color={Colors.emeraldBright} style={styles.check} />}
                </View>
              </ScaleOnPress>

              <ScaleOnPress
                onPress={() => setLanguage('ga')}
                disabled={language === 'ga'}
                style={{ flex: 1 }}
              >
                <View style={[styles.langCard, language === 'ga' && styles.langCardActive]}>
                  <Text style={styles.flag}>🇮🇪</Text>
                  <Text style={[styles.langText, language === 'ga' && styles.langTextActive]}>{t('irish')}</Text>
                  {language === 'ga' && <Ionicons name="checkmark-circle" size={18} color={Colors.emeraldBright} style={styles.check} />}
                </View>
              </ScaleOnPress>
            </View>
          </ThemedCard>
        </AnimatedEntry>

        {/* ── Preferences Section ── */}
        <AnimatedEntry delay={200}>
          <ThemedCard style={styles.section}>
            <Text style={styles.sectionTitle}>{language === 'ga' ? 'Roghanna' : 'Preferences'}</Text>
            <SettingRow
              icon="cash-outline"
              label={t('freeOnly')}
              value={user?.settings.budget_free_only || false}
              onToggle={(v: boolean) => handleToggle('budget_free_only', v)}
              color="#F59E0B"
            />
            <SettingRow
              icon="accessibility"
              label={t('wheelchairFriendly')}
              value={user?.settings.wheelchair_friendly || false}
              onToggle={(v: boolean) => handleToggle('wheelchair_friendly', v)}
              color="#3B82F6"
            />
            <SettingRow
              icon="shield-checkmark"
              label={t('filterRisky')}
              value={user?.settings.safety_sensitive ?? true}
              onToggle={(v: boolean) => handleToggle('safety_sensitive', v)}
              color={Colors.emeraldBright}
            />
          </ThemedCard>
        </AnimatedEntry>

        {/* ── User & About Info ── */}
        <AnimatedEntry delay={300}>
          <ThemedCard style={styles.section}>
            <Text style={styles.sectionTitle}>{language === 'ga' ? 'Eolas & Slándáil' : 'Info & Security'}</Text>
            <InfoRow label="User ID" value={`${user?.id?.slice(0, 12)}...`} icon="finger-print" />
            <View style={styles.infoRow}>
              <View style={styles.infoLabelGroup}>
                <Ionicons name="star" size={16} color={Colors.goldBright} style={{ marginRight: 8 }} />
                <Text style={styles.infoLabel}>{t('totalPoints')}</Text>
              </View>
              <View style={styles.pointsPill}>
                <Text style={styles.pointsValue}>{user?.total_points || 0} pts</Text>
              </View>
            </View>
            <InfoRow
              label={language === 'ga' ? 'Cineál' : 'Account Type'}
              value={user?.is_guest ? (language === 'ga' ? 'Aoi' : 'Guest') : (language === 'ga' ? 'Cláraithe' : 'Registered')}
              icon="person"
            />
            <InfoRow label={language === 'ga' ? 'Leagan' : 'Version'} value="1.0.2 (MVP)" icon="code-working" />
            <InfoRow label={language === 'ga' ? 'Foinse' : 'Data'} value="Fáilte Ireland" icon="server" />
          </ThemedCard>
        </AnimatedEntry>

        <ScaleOnPress onPress={() => Alert.alert('Demo', 'Logout is disabled in MVP demo.')}>
          <View style={styles.logoutBtn}>
            <Text style={styles.logoutText}>{language === 'ga' ? 'Logáil Amach' : 'Logout'}</Text>
          </View>
        </ScaleOnPress>

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.offWhite },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },

  // Sections
  section: {
    marginHorizontal: Spacing.base, marginTop: Spacing.md,
    padding: 16,
  },
  sectionTitle: { fontSize: Typography.sm, fontWeight: '800', color: Colors.slate, marginBottom: 16, letterSpacing: 0.5, textTransform: 'uppercase' },

  // Language
  languageGrid: { flexDirection: 'row', gap: 12 },
  langCard: {
    flex: 1, height: 90, borderRadius: Radius.lg,
    borderWidth: 2, borderColor: '#F1F5F9',
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#fff',
  },
  langCardActive: { borderColor: Colors.emeraldBright, backgroundColor: Colors.emeraldLight + '30' },
  flag: { fontSize: 32, marginBottom: 4 },
  langText: { fontSize: Typography.sm, fontWeight: '700', color: Colors.slate },
  langTextActive: { color: Colors.emerald },
  check: { position: 'absolute', top: 6, right: 6 },

  // Rows
  settingRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, borderTopWidth: 1, borderTopColor: '#F8FAFC',
  },
  settingInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  settingLabel: { fontSize: Typography.base, color: Colors.dark, fontWeight: '600' },

  infoRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, borderTopWidth: 1, borderTopColor: '#F8FAFC',
  },
  infoLabelGroup: { flexDirection: 'row', alignItems: 'center' },
  infoLabel: { fontSize: Typography.sm, color: Colors.slate, fontWeight: '500' },
  infoValue: { fontSize: Typography.sm, fontWeight: '700', color: Colors.dark, maxWidth: 140 },
  pointsPill: { backgroundColor: '#FEF3C7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  pointsValue: { fontSize: Typography.sm, fontWeight: '800', color: Colors.gold },

  // Logout
  logoutBtn: {
    marginTop: 24, marginHorizontal: Spacing.base,
    paddingVertical: 14, borderRadius: Radius.lg,
    alignItems: 'center', backgroundColor: '#FEE2E2',
  },
  logoutText: { color: '#B91C1C', fontWeight: '700', fontSize: Typography.base },
});
