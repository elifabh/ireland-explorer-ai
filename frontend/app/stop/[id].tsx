import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  TouchableOpacity, Alert, ActivityIndicator, Image, Platform
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { useAppStore, Stop, Location as LocationType } from '../../src/store/appStore';
import { t, getLocalizedName, getLocalizedContent } from '../../src/utils/translations';

export default function StopDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user, currentStops, checkIn, completeStop } = useAppStore();
  const [photo, setPhoto] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<LocationType | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const lang = user?.settings?.language || 'en';

  const stop = currentStops.find(s => s.id === id);

  useEffect(() => {
    getLocation();
  }, []);

  const getLocation = async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        setUserLocation({
          lat: location.coords.latitude,
          lng: location.coords.longitude
        });
      }
    } catch (err) {
      console.error('Location error:', err);
    }
    setLocationLoading(false);
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          lang === 'en' ? 'Permission Required' : 'Cead Riachtanach',
          lang === 'en' ? 'Camera access is needed to take photos' : 'Tá rochtain ceamara de dhíth chun grianghraif a thógáil'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        // Store raw base64 — backend expects this without data: prefix
        setPhoto(result.assets[0].base64);
      }
    } catch (err) {
      console.error('Camera error:', err);
      Alert.alert(t('error.generic', lang));
    }
  };

  const pickPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          lang === 'en' ? 'Permission Required' : 'Cead Riachtanach',
          lang === 'en' ? 'Gallery access is needed' : 'Tá rochtain gailearaí de dhíth'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        // Store raw base64 — backend expects this without data: prefix
        setPhoto(result.assets[0].base64);
      }
    } catch (err) {
      console.error('Gallery error:', err);
      Alert.alert(t('error.generic', lang));
    }
  };

  const handleCheckIn = async () => {
    if (!stop || !photo) {
      Alert.alert(
        lang === 'en' ? 'Photo Required' : 'Grianghraf Riachtanach',
        lang === 'en' ? 'Please take or select a photo first' : 'Tóg nó roghnaigh grianghraf ar dtús'
      );
      return;
    }

    // Use current location or POI location for demo
    setSubmitting(true);
    const result = await completeStop(stop.id, photo);
    setSubmitting(false);

    if (result.success) {
      Alert.alert(
        t('success.checkIn', lang),
        `+${result.points_awarded} ${lang === 'en' ? 'points!' : 'pointí!'}`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } else {
      Alert.alert(
        lang === 'en' ? 'Check-in Failed' : 'Theip ar Sheiceáil Isteach',
        lang === 'en' ? 'Failed to verify completion. Please try again.' : 'Teip ar fhíorú. Bain triail eile as.'
      );
    }
  };

  if (!stop) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#DC2626" />
          <Text style={styles.errorText}>
            {lang === 'en' ? 'Stop not found' : 'Níor aimsíodh an stad'}
          </Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>
              {lang === 'en' ? 'Go Back' : 'Téigh ar Ais'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const experiencePack = stop.experience_pack;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {getLocalizedName(stop.poi?.name_en || '', stop.poi?.name_ga, lang)}
          </Text>
          <Text style={styles.headerSubtitle}>
            {lang === 'en' ? `Stop ${stop.order}` : `Stad ${stop.order}`}
          </Text>
        </View>
        <View style={styles.headerButton} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Status Badge - UPDATED for non-linear stops */}
        <View style={[
          styles.statusBadge,
          stop.status === 'completed' ? styles.statusCompleted :
            stop.status === 'available' ? styles.statusAvailable : styles.statusSkipped
        ]}>
          <Ionicons
            name={stop.status === 'completed' ? 'checkmark-circle' : stop.status === 'available' ? 'location' : 'close-circle'}
            size={16}
            color="#FFFFFF"
          />
          <Text style={styles.statusText}>
            {stop.status === 'completed'
              ? (lang === 'en' ? 'Completed!' : 'Críochnaithe!')
              : stop.status === 'available'
                ? (lang === 'en' ? 'Available to Visit' : 'Ar Fáil le Cuairt')
                : (lang === 'en' ? 'Skipped' : 'Scipeáilte')}
          </Text>
        </View>

        {/* Timing Info */}
        <View style={styles.timingCard}>
          <View style={styles.timingItem}>
            <Ionicons name="walk" size={20} color="#059669" />
            <Text style={styles.timingText}>
              {stop.eta_from_previous_min} {t('stop.eta', lang)}
            </Text>
          </View>
          <View style={styles.timingDivider} />
          <View style={styles.timingItem}>
            <Ionicons name="hourglass" size={20} color="#059669" />
            <Text style={styles.timingText}>
              {stop.estimated_duration_min} {t('stop.duration', lang)}
            </Text>
          </View>
        </View>

        {/* Experience Pack */}
        {experiencePack && (
          <View style={styles.experienceCard}>
            <Text style={styles.experienceTitle}>
              {getLocalizedContent(experiencePack.title_en || '', experiencePack.title_ga, lang)}
            </Text>
            <Text style={styles.experienceContent}>
              {getLocalizedContent(experiencePack.content_en || '', experiencePack.content_ga, lang)}
            </Text>

            {/* Fun Facts */}
            {experiencePack.fun_facts && experiencePack.fun_facts.length > 0 && (
              <View style={styles.funFactsSection}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="bulb" size={20} color="#F59E0B" />
                  <Text style={styles.sectionTitle}>{t('stop.funFacts', lang)}</Text>
                </View>
                {experiencePack.fun_facts.map((fact: any, index: number) => (
                  <View key={index} style={styles.funFactItem}>
                    <Text style={styles.funFactText}>
                      • {lang === 'ga' && fact.ga ? fact.ga : fact.en}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Safety Notes */}
            {experiencePack.safety_notes && experiencePack.safety_notes.length > 0 && (
              <View style={styles.safetySection}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="warning" size={20} color="#DC2626" />
                  <Text style={[styles.sectionTitle, { color: '#DC2626' }]}>
                    {t('stop.safetyNotes', lang)}
                  </Text>
                </View>
                {experiencePack.safety_notes.map((note: string, index: number) => (
                  <Text key={index} style={styles.safetyText}>
                    • {note}
                  </Text>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Description Fallback */}
        {!experiencePack && stop.poi && (
          <View style={styles.descriptionCard}>
            <Text style={styles.description}>
              {getLocalizedContent(stop.poi?.description_en || '', stop.poi?.description_ga, lang)}
            </Text>
          </View>
        )}

        {/* Check-in Section - UPDATED: Show for available OR skipped stops (non-linear) */}
        {(stop.status === 'available' || stop.status === 'skipped') && (
          <View style={styles.checkInSection}>
            <Text style={styles.checkInTitle}>
              {lang === 'en' ? 'Check In Here!' : 'Seiceáil Isteach Anseo!'}
            </Text>
            <Text style={styles.checkInSubtitle}>
              {lang === 'en'
                ? 'Take a photo at this location to complete this stop and earn points!'
                : 'Tóg grianghraf ag an suíomh seo chun an stad seo a chríochnú agus pointí a thuilleamh!'}
            </Text>

            {/* Location Status */}
            <View style={styles.locationStatus}>
              <Ionicons
                name={userLocation ? 'location' : 'location-outline'}
                size={16}
                color={userLocation ? '#10B981' : '#6B7280'}
              />
              <Text style={[styles.locationStatusText, userLocation && { color: '#10B981' }]}>
                {locationLoading
                  ? (lang === 'en' ? 'Getting location...' : 'Suíomh á fháil...')
                  : userLocation
                    ? (lang === 'en' ? 'Location acquired' : 'Suíomh faighte')
                    : (lang === 'en' ? 'Location unavailable' : 'Níl suíomh ar fáil')}
              </Text>
            </View>

            {/* Photo Section */}
            {photo ? (
              <View style={styles.photoPreview}>
                <Image source={{ uri: `data:image/jpeg;base64,${photo}` }} style={styles.photoImage} />
                <TouchableOpacity
                  style={styles.retakeButton}
                  onPress={() => setPhoto(null)}
                >
                  <Ionicons name="refresh" size={20} color="#FFFFFF" />
                  <Text style={styles.retakeButtonText}>
                    {lang === 'en' ? 'Retake' : 'Athtógáil'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.photoButtons}>
                <TouchableOpacity style={styles.photoButton} onPress={takePhoto}>
                  <Ionicons name="camera" size={24} color="#FFFFFF" />
                  <Text style={styles.photoButtonText}>
                    {lang === 'en' ? 'Take Photo' : 'Tóg Grianghraf'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.photoButtonSecondary} onPress={pickPhoto}>
                  <Ionicons name="images" size={24} color="#059669" />
                  <Text style={styles.photoButtonSecondaryText}>
                    {lang === 'en' ? 'Choose from Gallery' : 'Roghnaigh ó Gailearaí'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                !photo && styles.submitButtonDisabled
              ]}
              onPress={handleCheckIn}
              disabled={!photo || submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
                  <Text style={styles.submitButtonText}>
                    {t('stop.complete', lang)}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={styles.pointsHint}>
              <Ionicons name="star" size={14} color="#F59E0B" /> +100 {lang === 'en' ? 'points' : 'pointí'}
            </Text>
          </View>
        )}

        {/* Completed Photo */}
        {stop.status === 'completed' && stop.completion_photo_base64 && (
          <View style={styles.completedSection}>
            <Text style={styles.completedTitle}>
              {lang === 'en' ? 'Your Visit' : 'Do Chuairt'}
            </Text>
            <Image
              source={{ uri: stop.completion_photo_base64 }}
              style={styles.completedPhoto}
            />
            {stop.points_awarded > 0 && (
              <View style={styles.pointsEarned}>
                <Ionicons name="star" size={20} color="#F59E0B" />
                <Text style={styles.pointsEarnedText}>
                  +{stop.points_awarded} {lang === 'en' ? 'points earned!' : 'pointí tuillte!'}
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0FDF4',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
  },
  backButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#059669',
    borderRadius: 12,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: Platform.OS === 'android' ? 40 : 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
    marginBottom: 16,
  },
  statusAvailable: {
    backgroundColor: '#3B82F6',
  },
  statusCompleted: {
    backgroundColor: '#10B981',
  },
  statusSkipped: {
    backgroundColor: '#9CA3AF',
  },
  statusText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  timingCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  timingItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  timingDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
  },
  timingText: {
    fontSize: 14,
    color: '#1F2937',
  },
  experienceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  experienceTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  experienceContent: {
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 24,
  },
  funFactsSection: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F59E0B',
  },
  funFactItem: {
    marginBottom: 8,
  },
  funFactText: {
    fontSize: 14,
    color: '#78350F',
    lineHeight: 20,
  },
  safetySection: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
  },
  safetyText: {
    fontSize: 14,
    color: '#7F1D1D',
    lineHeight: 20,
    marginBottom: 4,
  },
  descriptionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  description: {
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 24,
  },
  checkInSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  checkInTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#059669',
    marginBottom: 8,
  },
  checkInSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  locationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
  },
  locationStatusText: {
    fontSize: 12,
    color: '#6B7280',
  },
  photoPreview: {
    width: '100%',
    marginBottom: 16,
  },
  photoImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 12,
  },
  retakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6B7280',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  retakeButtonText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  photoButtons: {
    width: '100%',
    gap: 12,
    marginBottom: 16,
  },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  photoButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  photoButtonSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    borderWidth: 2,
    borderColor: '#059669',
  },
  photoButtonSecondaryText: {
    color: '#059669',
    fontWeight: '600',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    width: '100%',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  pointsHint: {
    marginTop: 12,
    fontSize: 14,
    color: '#F59E0B',
    fontWeight: '500',
  },
  completedSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  completedTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  completedPhoto: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
  },
  pointsEarned: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  pointsEarnedText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F59E0B',
  },
});
