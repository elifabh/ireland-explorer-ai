import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadow } from '../theme';
import { Stop, Language } from '../types';
import { t, getLocalizedName } from '../utils/translations';

interface StopNodeProps {
  stop: Stop;
  isFirst: boolean;
  isLast: boolean;
  lang: Language;
  onPress: (stop: Stop) => void;
}

export const StopNode: React.FC<StopNodeProps> = React.memo(({ stop, isFirst, isLast, lang, onPress }) => {
  const getStatusColor = () => {
    switch (stop.status) {
      case 'completed': return Colors.success;
      case 'available': return Colors.info;
      case 'locked': return Colors.slate;
      case 'skipped': return Colors.slate;
      default: return Colors.info;
    }
  };

  const getStatusIcon = () => {
    switch (stop.status) {
      case 'completed': return 'checkmark-circle';
      case 'available': return 'location';
      case 'locked': return 'lock-closed';
      case 'skipped': return 'close-circle';
      default: return 'location';
    }
  };

  const getStatusText = () => {
    switch (stop.status) {
      case 'completed': return t('route.completed', lang);
      case 'available': return lang === 'en' ? 'Available' : 'Ar fáil';
      case 'locked': return lang === 'en' ? 'Locked' : 'Glasáilte';
      case 'skipped': return lang === 'en' ? 'Skipped' : 'Scipeáilte';
      default: return '';
    }
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress(stop)}
      activeOpacity={0.7}
      disabled={stop.status === 'locked'}
    >
      {!isFirst && (
        <View style={[styles.connectionLine, styles.connectionTop, { backgroundColor: getStatusColor() }]} />
      )}

      <View style={[styles.nodeCircle, { borderColor: getStatusColor(), backgroundColor: stop.status === 'completed' ? getStatusColor() : Colors.white }]}>
        <Ionicons
          name={getStatusIcon() as any}
          size={24}
          color={stop.status === 'completed' ? Colors.white : getStatusColor()}
        />
        <Text style={[styles.orderNumber, { color: stop.status === 'completed' ? Colors.white : getStatusColor() }]}>
          {stop.order}
        </Text>
      </View>

      {!isLast && (
        <View style={[styles.connectionLine, styles.connectionBottom, { backgroundColor: stop.status === 'completed' ? Colors.success : Colors.mist }]} />
      )}

      <View style={[styles.content, stop.status === 'completed' && styles.contentCompleted]}>
        <Text style={[styles.title, stop.status === 'skipped' && styles.skippedText]}>
          {getLocalizedName(stop.poi?.name_en || 'Unknown', stop.poi?.name_ga, lang)}
        </Text>

        <View style={styles.infoRow}>
          <View style={styles.infoBadge}>
            <Ionicons name="time-outline" size={14} color={Colors.slate} />
            <Text style={styles.infoText}>{stop.eta_from_previous_min} {t('stop.eta', lang)}</Text>
          </View>
          <View style={styles.infoBadge}>
            <Ionicons name="hourglass-outline" size={14} color={Colors.slate} />
            <Text style={styles.infoText}>{stop.estimated_duration_min} {t('stop.duration', lang)}</Text>
          </View>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: getStatusColor() + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor() }]}>{getStatusText()}</Text>
        </View>

        {stop.points_awarded > 0 && (
          <View style={styles.pointsBadge}>
            <Ionicons name="star" size={14} color={Colors.goldBright} />
            <Text style={styles.pointsText}>+{stop.points_awarded}</Text>
          </View>
        )}

        {stop.status === 'available' && (
          <View style={styles.visitHint}>
            <Ionicons name="hand-left-outline" size={12} color={Colors.info} />
            <Text style={styles.visitHintText}>
              {lang === 'en' ? 'Tap to visit' : 'Tapáil le cuairt a thabhairt'}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    alignItems: 'flex-start',
  },
  connectionLine: { position: 'absolute', width: 3, left: 40 },
  connectionTop: { top: 0, height: 20 },
  connectionBottom: { bottom: 0, height: '50%' },
  nodeCircle: {
    width: 48, height: 48, borderRadius: 24, borderWidth: 3,
    alignItems: 'center', justifyContent: 'center', zIndex: 1,
  },
  orderNumber: { fontSize: 10, fontWeight: 'bold', position: 'absolute', bottom: 2 },
  content: {
    flex: 1, marginLeft: Spacing.base, backgroundColor: Colors.white, borderRadius: Radius.md, padding: Spacing.base,
    ...Shadow.sm,
  },
  contentCompleted: { backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: Colors.success },
  title: { fontSize: Typography.base, fontWeight: '600', color: Colors.dark, marginBottom: Spacing.xs },
  skippedText: { color: Colors.slate, textDecorationLine: 'line-through' },
  infoRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.sm },
  infoBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  infoText: { fontSize: Typography.xs, color: Colors.slate },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  statusText: { fontSize: Typography.xs, fontWeight: '600' },
  pointsBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, position: 'absolute', top: 12, right: 12 },
  pointsText: { fontSize: Typography.sm, fontWeight: '700', color: Colors.goldBright },
  visitHint: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: Spacing.sm },
  visitHintText: { fontSize: 11, color: Colors.info, fontStyle: 'italic' },
});
