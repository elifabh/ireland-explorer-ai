import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TimePreset, Language } from '../store/appStore';
import { t } from '../utils/translations';

interface TimeSelectorProps {
  selected: TimePreset;
  onSelect: (preset: TimePreset) => void;
  lang: Language;
}

const timeOptions: { preset: TimePreset; icon: string }[] = [
  { preset: '30m', icon: 'flash-outline' },
  { preset: '60m', icon: 'time-outline' },
  { preset: '90m', icon: 'walk-outline' },
  { preset: '2h', icon: 'bicycle-outline' },
  { preset: '4h', icon: 'map-outline' },
  { preset: '1d', icon: 'sunny-outline' },
];

export const TimeSelector: React.FC<TimeSelectorProps> = ({ selected, onSelect, lang }) => {
  return (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {timeOptions.map(({ preset, icon }) => (
        <TouchableOpacity
          key={preset}
          style={[
            styles.option,
            selected === preset && styles.optionSelected
          ]}
          onPress={() => onSelect(preset)}
        >
          <Ionicons 
            name={icon as any} 
            size={24} 
            color={selected === preset ? '#FFFFFF' : '#059669'} 
          />
          <Text style={[
            styles.optionText,
            selected === preset && styles.optionTextSelected
          ]}>
            {t(`time.${preset}`, lang)}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  option: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
    borderWidth: 2,
    borderColor: '#10B981',
    alignItems: 'center',
    minWidth: 90,
  },
  optionSelected: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  optionText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#059669',
    marginTop: 4,
    textAlign: 'center',
  },
  optionTextSelected: {
    color: '#FFFFFF',
  },
});
