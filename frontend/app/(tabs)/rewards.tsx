import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../../src/context/AppContext';
import { api } from '../../src/services/api';
import { Reward } from '../../src/types';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../src/theme';
import { AnimatedEntry, ThemedHeader, IconCircle, ScaleOnPress } from '../../src/components/ui';

export default function RewardsScreen() {
  const { t, language, user, refreshUser } = useApp();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);

  useEffect(() => { loadRewards(); }, []);

  const loadRewards = async () => {
    try {
      const rewardsList = await api.getRewards();
      setRewards(rewardsList);
    } catch (e) { console.error('Failed to load rewards:', e); }
    finally { setIsLoading(false); }
  };

  const handleClaimReward = async (reward: Reward) => {
    if (!user) return;
    if (user.total_points < reward.points_required) {
      Alert.alert(t('error'), t('insufficientPoints'));
      return;
    }
    setClaiming(reward.id);
    try {
      const result = await api.claimReward(reward.id, user.id);
      Alert.alert(
        t('success'),
        `${t('demoReward')}\n\nCode: ${result.demo_code}\n\n${t('notRedeemable')}`,
        [{ text: 'OK' }]
      );
      await refreshUser();
    } catch (error: any) {
      Alert.alert(t('error'), error.response?.data?.detail || 'Failed to claim reward');
    } finally { setClaiming(null); }
  };

  const getCategoryTheme = (category: string) => {
    switch (category) {
      case 'food': return { icon: 'restaurant', color: '#F59E0B', bg: '#FEF3C7' };
      case 'activity': return { icon: 'ticket', color: '#10B981', bg: '#D1FAE5' };
      case 'merchandise': return { icon: 'gift', color: '#8B5CF6', bg: '#EDE9FE' };
      default: return { icon: 'star', color: Colors.goldBright, bg: '#FEF3C7' };
    }
  };

  const renderReward = ({ item, index }: { item: Reward; index: number }) => {
    const canClaim = user && user.total_points >= item.points_required;
    const theme = getCategoryTheme(item.category);

    return (
      <AnimatedEntry delay={index * 100}>
        <View style={[styles.rewardCard, !canClaim && styles.rewardCardLocked]}>
          <View style={styles.cardHeader}>
            <IconCircle icon={theme.icon} color={theme.color} bgColor={theme.bg} containerSize={48} size={24} />
            <View style={styles.badgeRow}>
              {!canClaim && (
                <View style={styles.lockedBadge}>
                  <Ionicons name="lock-closed" size={10} color={Colors.slate} />
                  <Text style={styles.lockedBadgeText}>LOCKED</Text>
                </View>
              )}
              <View style={styles.demoBadge}>
                <Text style={styles.demoBadgeText}>DEMO</Text>
              </View>
            </View>
          </View>

          <Text style={styles.rewardName}>
            {language === 'ga' && item.name_ga ? item.name_ga : item.name_en}
          </Text>
          <Text style={styles.rewardDescription} numberOfLines={2}>
            {language === 'ga' && item.description_ga ? item.description_ga : item.description_en}
          </Text>

          <View style={styles.rewardFooter}>
            <View style={styles.pointsShield}>
              <Ionicons name="star" size={16} color={Colors.goldBright} />
              <Text style={styles.pointsText}>{item.points_required}</Text>
            </View>

            <ScaleOnPress
              onPress={() => handleClaimReward(item)}
              disabled={!canClaim || claiming === item.id}
              scaleTo={0.96}
            >
              <LinearGradient
                colors={canClaim ? ['#10B981', '#059669'] : ['#94A3B8', '#64748B']}
                style={styles.claimBtn}
              >
                {claiming === item.id ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.claimBtnText}>{t('claimReward')}</Text>
                )}
              </LinearGradient>
            </ScaleOnPress>
          </View>
        </View>
      </AnimatedEntry>
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      <ThemedHeader
        title={t('rewards')}
        subtitle={language === 'ga' ? 'Duaiseanna Turasóra 🎁' : 'Tourist Rewards 🎁'}
        rightComponent={
          <LinearGradient colors={[Colors.goldBright, Colors.gold]} style={styles.pointsBanner}>
            <Ionicons name="star" size={18} color="#fff" />
            <Text style={styles.pointsBannerValue}>{user?.total_points || 0}</Text>
          </LinearGradient>
        }
      />

      <View style={styles.infoBannerWrap}>
        <LinearGradient
          colors={['rgba(59, 130, 246, 0.15)', 'rgba(59, 130, 246, 0.05)']}
          style={styles.infoBanner}
        >
          <Ionicons name="information-circle" size={20} color="#3B82F6" />
          <Text style={styles.infoText}>
            {language === 'ga'
              ? 'Is duaiseanna taispeánta iad seo le haghaidh an MVP'
              : 'These are demo rewards for MVP - not redeemable in real life'}
          </Text>
        </LinearGradient>
      </View>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={Colors.emeraldBright} />
        </View>
      ) : (
        <FlatList
          data={rewards}
          renderItem={renderReward}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          numColumns={1}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.offWhite },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  pointsBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full,
    ...Shadow.sm,
  },
  pointsBannerValue: { fontSize: Typography.md, fontWeight: '800', color: '#fff' },

  // Info Banner
  infoBannerWrap: { paddingHorizontal: Spacing.base, marginTop: Spacing.md },
  infoBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 12, borderRadius: Radius.md,
    borderWidth: 1, borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  infoText: { flex: 1, fontSize: 13, color: '#1E40AF', fontWeight: '500' },

  // List
  listContent: { padding: Spacing.base, paddingBottom: 40 },
  rewardCard: {
    backgroundColor: '#fff', borderRadius: Radius.xl,
    padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: '#F1F5F9',
    ...Shadow.md,
  },
  rewardCardLocked: { opacity: 0.8, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  badgeRow: { alignItems: 'flex-end', gap: 6 },
  lockedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#E2E8F0', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
  },
  lockedBadgeText: { fontSize: 8, fontWeight: '800', color: Colors.slate },
  demoBadge: { backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  demoBadgeText: { fontSize: 9, fontWeight: '800', color: '#92400E' },

  rewardName: { fontSize: Typography.base, fontWeight: '800', color: Colors.dark, marginBottom: 4 },
  rewardDescription: { fontSize: Typography.sm, color: Colors.slate, marginBottom: 16, lineHeight: 20 },

  rewardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pointsShield: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.offWhite, paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.full,
  },
  pointsText: { fontSize: Typography.md, fontWeight: '800', color: Colors.gold },

  claimBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: Radius.lg },
  claimBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
