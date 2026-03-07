import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  TouchableOpacity, Alert, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore, Reward } from '../../src/store/appStore';
import { t, getLocalizedName, getLocalizedContent } from '../../src/utils/translations';

export default function PointsScreen() {
  const { user, rewards, loadRewards, redeemReward, currentTrip } = useAppStore();
  const [claimedRewards, setClaimedRewards] = useState<string[]>([]);
  const lang = user?.settings?.language || 'en';

  useEffect(() => {
    loadRewards();
  }, []);

  const handleRedeem = async (reward: Reward) => {
    const points = user?.total_points || 0;

    if (points < reward.points_required) {
      Alert.alert(
        t('points.notEnough', lang),
        lang === 'en'
          ? `You need ${reward.points_required - points} more points`
          : `Tá ${reward.points_required - points} pointe eile de dhíth ort`
      );
      return;
    }

    const result = await redeemReward(reward.id);
    if (result.success) {
      setClaimedRewards([...claimedRewards, reward.id]);
      Alert.alert(
        t('points.claimed', lang),
        `${lang === 'en' ? 'Demo Code' : 'Cód Taispeántais'}: ${result.code}\n\n${lang === 'en' ? '(This is a demo reward, not redeemable in real world)' : '(Is duais taispeántais í seo, ní féidir í a fhuascáil sa saol fír)'}`
      );
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'food': return 'cafe';
      case 'culture': return 'library';
      case 'transport': return 'bus';
      case 'experience': return 'walk';
      default: return 'gift';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Points Header */}
        <View style={styles.pointsHeader}>
          <View style={styles.pointsCircle}>
            <Ionicons name="star" size={40} color="#F59E0B" />
            <Text style={styles.pointsValue}>{user?.total_points || 0}</Text>
            <Text style={styles.pointsLabel}>{t('points.total', lang)}</Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="trophy" size={24} color="#10B981" />
              <Text style={styles.statValue}>{currentTrip ? 1 : 0}</Text>
              <Text style={styles.statLabel}>
                {lang === 'en' ? 'Trips' : 'Turais'}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="location" size={24} color="#059669" />
              <Text style={styles.statValue}>{currentTrip?.completed_stops || 0}</Text>
              <Text style={styles.statLabel}>
                {lang === 'en' ? 'Stops Visited' : 'Stadanna ar Cuairt'}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="gift" size={24} color="#8B5CF6" />
              <Text style={styles.statValue}>{claimedRewards.length}</Text>
              <Text style={styles.statLabel}>
                {lang === 'en' ? 'Rewards' : 'Duaiseanna'}
              </Text>
            </View>
          </View>
        </View>

        {/* Demo Banner */}
        <View style={styles.demoBanner}>
          <Ionicons name="information-circle" size={20} color="#6366F1" />
          <Text style={styles.demoBannerText}>
            {lang === 'en'
              ? 'These are DEMO rewards - not redeemable in the real world yet. Partner integration coming soon!'
              : 'Is duaiseanna TAISPEÁNTAIS iad seo - ní féidir iad a fhuascáil sa saol fír fós. Comhtháthú comhpháirtí ag teacht go luath!'}
          </Text>
        </View>

        {/* Rewards Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('points.rewards', lang)}</Text>

          <View style={styles.rewardsGrid}>
            {rewards.map((reward) => {
              const isClaimed = claimedRewards.includes(reward.id);
              const canAfford = (user?.total_points || 0) >= reward.points_required;

              return (
                <View key={reward.id} style={styles.rewardCard}>
                  <View style={[
                    styles.rewardIconContainer,
                    isClaimed && styles.rewardIconClaimed
                  ]}>
                    <Ionicons
                      name={getCategoryIcon(reward.category) as any}
                      size={28}
                      color={isClaimed ? '#10B981' : '#059669'}
                    />
                  </View>

                  <Text style={styles.rewardName}>
                    {getLocalizedName(reward.name_en, reward.name_ga, lang)}
                  </Text>
                  <Text style={styles.rewardDescription} numberOfLines={2}>
                    {getLocalizedContent(reward.description_en, reward.description_ga, lang)}
                  </Text>

                  <View style={styles.rewardFooter}>
                    <View style={styles.pointsCost}>
                      <Ionicons name="star" size={16} color="#F59E0B" />
                      <Text style={styles.pointsCostText}>{reward.points_required}</Text>
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.redeemButton,
                        isClaimed && styles.redeemButtonClaimed,
                        !canAfford && !isClaimed && styles.redeemButtonDisabled
                      ]}
                      onPress={() => !isClaimed && handleRedeem(reward)}
                      disabled={isClaimed}
                    >
                      <Text style={[
                        styles.redeemButtonText,
                        isClaimed && styles.redeemButtonTextClaimed,
                        !canAfford && !isClaimed && styles.redeemButtonTextDisabled
                      ]}>
                        {isClaimed
                          ? t('points.claimed', lang)
                          : t('points.redeem', lang)}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* How to Earn */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {lang === 'en' ? 'How to Earn Points' : 'Conas Pointí a Thuilleamh'}
          </Text>

          <View style={styles.earnCard}>
            <View style={styles.earnItem}>
              <View style={styles.earnIconCircle}>
                <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
              </View>
              <View style={styles.earnContent}>
                <Text style={styles.earnTitle}>
                  {lang === 'en' ? 'Complete a Stop' : 'Críochnaigh Stad'}
                </Text>
                <Text style={styles.earnPoints}>+100 {lang === 'en' ? 'points' : 'pointí'}</Text>
              </View>
            </View>

            <View style={styles.earnItem}>
              <View style={[styles.earnIconCircle, { backgroundColor: '#F59E0B' }]}>
                <Ionicons name="trophy" size={24} color="#FFFFFF" />
              </View>
              <View style={styles.earnContent}>
                <Text style={styles.earnTitle}>
                  {lang === 'en' ? 'Complete a Trip' : 'Críochnaigh Turas'}
                </Text>
                <Text style={styles.earnPoints}>+200 {lang === 'en' ? 'bonus points' : 'pointí bónais'}</Text>
              </View>
            </View>

            <View style={styles.earnItem}>
              <View style={[styles.earnIconCircle, { backgroundColor: '#8B5CF6' }]}>
                <Ionicons name="ribbon" size={24} color="#FFFFFF" />
              </View>
              <View style={styles.earnContent}>
                <Text style={styles.earnTitle}>
                  {lang === 'en' ? 'First Visit Bonus' : 'Bónas Chéad Cuairt'}
                </Text>
                <Text style={styles.earnPoints}>+50 {lang === 'en' ? 'points' : 'pointí'}</Text>
              </View>
            </View>
          </View>
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
  pointsHeader: {
    backgroundColor: '#059669',
    paddingTop: Platform.OS === 'android' ? 40 : 20,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  pointsCircle: {
    alignItems: 'center',
    marginBottom: 24,
  },
  pointsValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 8,
  },
  pointsLabel: {
    fontSize: 14,
    color: '#A7F3D0',
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 16,
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 11,
    color: '#A7F3D0',
    marginTop: 4,
    textAlign: 'center',
  },
  demoBanner: {
    flexDirection: 'row',
    backgroundColor: '#EEF2FF',
    margin: 16,
    padding: 12,
    borderRadius: 12,
    alignItems: 'flex-start',
    gap: 8,
  },
  demoBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#4F46E5',
    lineHeight: 18,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  rewardsGrid: {
    gap: 12,
  },
  rewardCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  rewardIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  rewardIconClaimed: {
    backgroundColor: '#D1FAE5',
  },
  rewardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  rewardDescription: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 12,
  },
  rewardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pointsCost: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pointsCostText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F59E0B',
  },
  redeemButton: {
    backgroundColor: '#059669',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  redeemButtonClaimed: {
    backgroundColor: '#D1FAE5',
  },
  redeemButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  redeemButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  redeemButtonTextClaimed: {
    color: '#10B981',
  },
  redeemButtonTextDisabled: {
    color: '#9CA3AF',
  },
  earnCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    gap: 16,
  },
  earnItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  earnIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  earnContent: {
    flex: 1,
  },
  earnTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  earnPoints: {
    fontSize: 13,
    color: '#10B981',
    fontWeight: '600',
    marginTop: 2,
  },
});
