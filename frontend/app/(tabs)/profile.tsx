import React from 'react';
import { 
  View, Text, StyleSheet, ScrollView, SafeAreaView, 
  TouchableOpacity, Switch, Platform 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore, Interest, TravelMode, Pace } from '../../src/store/appStore';
import { t } from '../../src/utils/translations';

export default function ProfileScreen() {
  const { user, updateSettings } = useAppStore();
  const lang = user?.settings?.language || 'en';
  const settings = user?.settings;

  const toggleInterest = (interest: Interest) => {
    const current = settings?.interests || [];
    const updated = current.includes(interest)
      ? current.filter(i => i !== interest)
      : [...current, interest];
    updateSettings({ interests: updated });
  };

  const interests: { key: Interest; icon: string }[] = [
    { key: 'history', icon: 'library' },
    { key: 'nature', icon: 'leaf' },
    { key: 'museums_indoor', icon: 'business' },
    { key: 'viewpoints', icon: 'eye' },
  ];

  const travelModes: { key: TravelMode; icon: string }[] = [
    { key: 'walk', icon: 'walk' },
    { key: 'public_transport', icon: 'bus' },
    { key: 'car', icon: 'car' },
  ];

  const paces: Pace[] = ['relaxed', 'normal', 'fast'];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <Ionicons name="person" size={40} color="#FFFFFF" />
          </View>
          <Text style={styles.guestLabel}>
            {lang === 'en' ? 'Guest User' : 'Úsáideoir Aíonna'}
          </Text>
          <View style={styles.pointsBadge}>
            <Ionicons name="star" size={16} color="#F59E0B" />
            <Text style={styles.pointsText}>{user?.total_points || 0}</Text>
          </View>
        </View>

        {/* Language Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.language', lang)}</Text>
          <View style={styles.languageRow}>
            <TouchableOpacity
              style={[
                styles.languageOption,
                lang === 'en' && styles.languageOptionSelected
              ]}
              onPress={() => updateSettings({ language: 'en' })}
            >
              <Text style={[
                styles.languageText,
                lang === 'en' && styles.languageTextSelected
              ]}>English</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.languageOption,
                lang === 'ga' && styles.languageOptionSelected
              ]}
              onPress={() => updateSettings({ language: 'ga' })}
            >
              <Text style={[
                styles.languageText,
                lang === 'ga' && styles.languageTextSelected
              ]}>Gaeilge</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Interests Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.interests', lang)}</Text>
          <View style={styles.interestsGrid}>
            {interests.map(({ key, icon }) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.interestItem,
                  settings?.interests?.includes(key) && styles.interestItemSelected
                ]}
                onPress={() => toggleInterest(key)}
              >
                <Ionicons 
                  name={icon as any} 
                  size={24} 
                  color={settings?.interests?.includes(key) ? '#FFFFFF' : '#059669'} 
                />
                <Text style={[
                  styles.interestText,
                  settings?.interests?.includes(key) && styles.interestTextSelected
                ]}>
                  {t(`interest.${key}`, lang)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Travel Mode Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.travelMode', lang)}</Text>
          <View style={styles.modeRow}>
            {travelModes.map(({ key, icon }) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.modeItem,
                  settings?.travel_mode === key && styles.modeItemSelected
                ]}
                onPress={() => updateSettings({ travel_mode: key })}
              >
                <Ionicons 
                  name={icon as any} 
                  size={28} 
                  color={settings?.travel_mode === key ? '#FFFFFF' : '#059669'} 
                />
                <Text style={[
                  styles.modeText,
                  settings?.travel_mode === key && styles.modeTextSelected
                ]}>
                  {t(`mode.${key}`, lang)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Pace Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.pace', lang)}</Text>
          <View style={styles.paceRow}>
            {paces.map((pace) => (
              <TouchableOpacity
                key={pace}
                style={[
                  styles.paceItem,
                  settings?.pace === pace && styles.paceItemSelected
                ]}
                onPress={() => updateSettings({ pace })}
              >
                <Text style={[
                  styles.paceText,
                  settings?.pace === pace && styles.paceTextSelected
                ]}>
                  {t(`pace.${pace}`, lang)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Accessibility Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.accessibility', lang)}</Text>
          <View style={styles.card}>
            <View style={styles.switchRow}>
              <View style={styles.switchLabel}>
                <Ionicons name="accessibility" size={20} color="#6B7280" />
                <Text style={styles.switchText}>{t('profile.wheelchair', lang)}</Text>
              </View>
              <Switch
                value={settings?.wheelchair_friendly || false}
                onValueChange={(value) => updateSettings({ wheelchair_friendly: value })}
                trackColor={{ false: '#E5E7EB', true: '#A7F3D0' }}
                thumbColor={settings?.wheelchair_friendly ? '#059669' : '#9CA3AF'}
              />
            </View>
          </View>
        </View>

        {/* Safety Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.safety', lang)}</Text>
          <View style={styles.card}>
            <View style={styles.switchRow}>
              <View style={styles.switchLabel}>
                <Ionicons name="warning" size={20} color="#F59E0B" />
                <Text style={styles.switchText}>{t('profile.avoidCliffs', lang)}</Text>
              </View>
              <Switch
                value={settings?.safety_sensitive || false}
                onValueChange={(value) => updateSettings({ safety_sensitive: value })}
                trackColor={{ false: '#E5E7EB', true: '#FDE68A' }}
                thumbColor={settings?.safety_sensitive ? '#F59E0B' : '#9CA3AF'}
              />
            </View>
          </View>
        </View>

        {/* Budget Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.budget', lang)}</Text>
          <View style={styles.card}>
            <View style={styles.switchRow}>
              <View style={styles.switchLabel}>
                <Ionicons name="cash" size={20} color="#10B981" />
                <Text style={styles.switchText}>{t('profile.freeOnly', lang)}</Text>
              </View>
              <Switch
                value={settings?.budget_free_only || false}
                onValueChange={(value) => updateSettings({ budget_free_only: value })}
                trackColor={{ false: '#E5E7EB', true: '#A7F3D0' }}
                thumbColor={settings?.budget_free_only ? '#10B981' : '#9CA3AF'}
              />
            </View>
          </View>
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appName}>
            {lang === 'en' ? 'Ireland Explorer' : 'Taiscéalaí na hÉireann'}
          </Text>
          <Text style={styles.appVersion}>v1.0.0 (MVP)</Text>
          <Text style={styles.appNote}>
            {lang === 'en' 
              ? 'Republic of Ireland only. Demo rewards not redeemable.'
              : 'Poblacht na hÉireann amháin. Ní féidir duaiseanna taispeántais a fhuascáil.'}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0FDF4',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    backgroundColor: '#059669',
    paddingTop: Platform.OS === 'android' ? 40 : 20,
    paddingBottom: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  guestLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  pointsText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  section: {
    padding: 16,
    paddingBottom: 0,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  languageRow: {
    flexDirection: 'row',
    gap: 12,
  },
  languageOption: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  languageOptionSelected: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  languageText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
  },
  languageTextSelected: {
    color: '#FFFFFF',
  },
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  interestItem: {
    width: '47%',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#10B981',
    gap: 8,
  },
  interestItemSelected: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  interestText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#059669',
  },
  interestTextSelected: {
    color: '#FFFFFF',
  },
  modeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  modeItem: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#10B981',
    gap: 8,
  },
  modeItemSelected: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  modeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#059669',
    textAlign: 'center',
  },
  modeTextSelected: {
    color: '#FFFFFF',
  },
  paceRow: {
    flexDirection: 'row',
    gap: 12,
  },
  paceItem: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  paceItemSelected: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  paceText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  paceTextSelected: {
    color: '#FFFFFF',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  switchText: {
    fontSize: 14,
    color: '#1F2937',
    flex: 1,
  },
  appInfo: {
    alignItems: 'center',
    padding: 32,
    gap: 4,
  },
  appName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#059669',
  },
  appVersion: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  appNote: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
  },
});
