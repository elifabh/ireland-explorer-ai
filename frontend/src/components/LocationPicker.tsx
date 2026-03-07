import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Modal,
  Dimensions,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import debounce from 'lodash.debounce';
import { GeoLocation } from '../types';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';

const { width, height } = Dimensions.get('window');

// Ireland bounds for validation
const IRELAND_BOUNDS = {
  minLat: 51.4,
  maxLat: 55.5,
  minLng: -10.5,
  maxLng: -5.5,
};

// Default center (Dublin)
const DEFAULT_CENTER = {
  lat: 53.3498,
  lng: -6.2603,
};

interface LocationPickerProps {
  onLocationSelect: (location: GeoLocation) => void;
  initialLocation?: GeoLocation | null;
}

type LocationMode = 'gps' | 'search' | 'map';

export const LocationPicker: React.FC<LocationPickerProps> = ({
  onLocationSelect,
  initialLocation,
}) => {
  const { t, language } = useApp();
  const [mode, setMode] = useState<LocationMode>('gps');
  const [selectedLocation, setSelectedLocation] = useState<GeoLocation | null>(initialLocation || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeoLocation[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingGPS, setIsLoadingGPS] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [gpsDebug, setGpsDebug] = useState<string | null>(null);

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      if (query.length < 2) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const results = await api.searchLocation(query, 'IE', 5);
        setSearchResults(results);
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 500),
    []
  );

  useEffect(() => {
    if (mode === 'search' && searchQuery) {
      debouncedSearch(searchQuery);
    }
  }, [searchQuery, mode]);

  // Get current GPS location - uses native browser API on web for better accuracy
  const getCurrentLocation = async () => {
    setIsLoadingGPS(true);
    setGpsError(null);
    setGpsDebug(null);

    try {
      let latitude: number;
      let longitude: number;

      if (Platform.OS === 'web') {
        // On web, use browser's native Geolocation API (much more accurate than expo-location on web)
        if (!navigator.geolocation) {
          setGpsError('GPS not supported in this browser. Please use the Search tab instead.');
          setIsLoadingGPS(false);
          return;
        }

        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          });
        });
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
        setGpsDebug(`📍 Browser GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)} (accuracy: ±${Math.round(position.coords.accuracy)}m)`);
      } else {
        // On native (iOS/Android), use expo-location
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setGpsError(t('locationPermissionDenied'));
          setIsLoadingGPS(false);
          return;
        }
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        latitude = location.coords.latitude;
        longitude = location.coords.longitude;
        setGpsDebug(`📍 Expo GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
      }

      // Check if within Ireland bounds
      if (
        latitude < IRELAND_BOUNDS.minLat ||
        latitude > IRELAND_BOUNDS.maxLat ||
        longitude < IRELAND_BOUNDS.minLng ||
        longitude > IRELAND_BOUNDS.maxLng
      ) {
        Alert.alert(
          'Outside Ireland',
          'GPS shows you outside Ireland. This may be a browser limitation — try the Search tab to manually enter your location.',
          [{ text: 'OK' }]
        );
        const dublinLocation: GeoLocation = {
          lat: DEFAULT_CENTER.lat,
          lng: DEFAULT_CENTER.lng,
          label: 'Dublin City Centre, Ireland',
          source: 'default',
        };
        setSelectedLocation(dublinLocation);
        onLocationSelect(dublinLocation);
        setIsLoadingGPS(false);
        return;
      }

      // Reverse geocode to get a human-readable address
      try {
        const geoResult = await api.reverseGeocode(latitude, longitude);
        const gpsLocation: GeoLocation = {
          lat: latitude,
          lng: longitude,
          label: geoResult.label,
          source: 'gps',
        };
        setSelectedLocation(gpsLocation);
        onLocationSelect(gpsLocation);
      } catch {
        // Reverse geocode failed — still use the coordinates, just show them
        const gpsLocation: GeoLocation = {
          lat: latitude,
          lng: longitude,
          label: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
          source: 'gps',
        };
        setSelectedLocation(gpsLocation);
        onLocationSelect(gpsLocation);
      }
    } catch (error: any) {
      console.error('GPS error:', error);
      if (error?.code === 1) {
        setGpsError('Location access denied. Please allow location in your browser settings, or use the Search tab.');
      } else if (error?.code === 2) {
        setGpsError('Location unavailable. Try the Search tab instead.');
      } else if (error?.code === 3) {
        setGpsError('Location request timed out. Try the Search tab instead.');
      } else {
        setGpsError(t('gpsUnavailable'));
      }
    } finally {
      setIsLoadingGPS(false);
    }
  };


  // Handle search result selection
  const handleSearchSelect = (location: GeoLocation) => {
    const manualLocation: GeoLocation = {
      ...location,
      source: 'manual',
    };
    setSelectedLocation(manualLocation);
    onLocationSelect(manualLocation);
    setSearchQuery('');
    setSearchResults([]);
  };

  // Handle map pin selection (simplified - no actual map in this version)
  const handleMapSelect = async (lat: number, lng: number) => {
    try {
      const geoResult = await api.reverseGeocode(lat, lng);
      const mapLocation: GeoLocation = {
        lat,
        lng,
        label: geoResult.label,
        source: 'manual',
      };
      setSelectedLocation(mapLocation);
      onLocationSelect(mapLocation);
      setShowMapModal(false);
    } catch (error) {
      const mapLocation: GeoLocation = {
        lat,
        lng,
        label: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        source: 'manual',
      };
      setSelectedLocation(mapLocation);
      onLocationSelect(mapLocation);
      setShowMapModal(false);
    }
  };

  // Popular Ireland locations for quick selection
  const popularLocations: GeoLocation[] = [
    { lat: 53.3498, lng: -6.2603, label: 'Dublin City Centre', source: 'preset' },
    { lat: 51.8985, lng: -8.4756, label: 'Cork City', source: 'preset' },
    { lat: 53.2707, lng: -9.0568, label: 'Galway City', source: 'preset' },
    { lat: 52.6638, lng: -8.6267, label: 'Limerick City', source: 'preset' },
    { lat: 54.5973, lng: -5.9301, label: 'Belfast (NI)', source: 'preset' },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('startLocation')}</Text>

      {/* Mode Selection Tabs */}
      <View style={styles.modeContainer}>
        <TouchableOpacity
          style={[styles.modeTab, mode === 'gps' && styles.modeTabActive]}
          onPress={() => setMode('gps')}
        >
          <Ionicons
            name="location"
            size={20}
            color={mode === 'gps' ? '#fff' : '#16a34a'}
          />
          <Text style={[styles.modeText, mode === 'gps' && styles.modeTextActive]}>
            GPS
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modeTab, mode === 'search' && styles.modeTabActive]}
          onPress={() => setMode('search')}
        >
          <Ionicons
            name="search"
            size={20}
            color={mode === 'search' ? '#fff' : '#16a34a'}
          />
          <Text style={[styles.modeText, mode === 'search' && styles.modeTextActive]}>
            {t('searchAddress')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modeTab, mode === 'map' && styles.modeTabActive]}
          onPress={() => setMode('map')}
        >
          <Ionicons
            name="map"
            size={20}
            color={mode === 'map' ? '#fff' : '#16a34a'}
          />
          <Text style={[styles.modeText, mode === 'map' && styles.modeTextActive]}>
            {t('pickOnMap')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* GPS Mode */}
      {mode === 'gps' && (
        <View style={styles.modeContent}>
          <TouchableOpacity
            style={styles.gpsButton}
            onPress={getCurrentLocation}
            disabled={isLoadingGPS}
          >
            {isLoadingGPS ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="navigate" size={24} color="#fff" />
                <Text style={styles.gpsButtonText}>{t('useCurrentLocation')}</Text>
              </>
            )}
          </TouchableOpacity>
          {gpsError && <Text style={styles.errorText}>{gpsError}</Text>}
          {gpsDebug && (
            <View style={{ marginTop: 8, padding: 8, backgroundColor: '#f0fdf4', borderRadius: 8, borderWidth: 1, borderColor: '#86efac' }}>
              <Text style={{ fontSize: 11, color: '#166534', fontFamily: 'monospace' }}>{gpsDebug}</Text>
            </View>
          )}
        </View>
      )}

      {/* Search Mode */}
      {mode === 'search' && (
        <View style={styles.modeContent}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder={t('searchPlaceholder')}
              placeholderTextColor="#9ca3af"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
            />
            {isSearching && <ActivityIndicator size="small" color="#16a34a" />}
          </View>

          {searchResults.length > 0 && (
            <FlatList
              data={searchResults}
              keyExtractor={(item, index) => `${item.lat}-${item.lng}-${index}`}
              style={styles.resultsList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.resultItem}
                  onPress={() => handleSearchSelect(item)}
                >
                  <Ionicons name="location-outline" size={20} color="#16a34a" />
                  <Text style={styles.resultText} numberOfLines={2}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              )}
            />
          )}

          {/* Popular Locations */}
          {searchQuery.length === 0 && (
            <View style={styles.popularContainer}>
              <Text style={styles.popularTitle}>Popular Starting Points</Text>
              {popularLocations.map((loc, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.popularItem}
                  onPress={() => handleSearchSelect(loc)}
                >
                  <Ionicons name="star" size={18} color="#f59e0b" />
                  <Text style={styles.popularText}>{loc.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Map Mode - Simplified coordinate picker */}
      {mode === 'map' && (
        <View style={styles.modeContent}>
          <View style={styles.mapPlaceholder}>
            <Ionicons name="map-outline" size={48} color="#16a34a" />
            <Text style={styles.mapPlaceholderText}>
              Select a popular location or use coordinates
            </Text>

            {/* Quick location buttons */}
            <View style={styles.quickLocations}>
              {popularLocations.slice(0, 4).map((loc, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.quickLocationBtn}
                  onPress={() => handleMapSelect(loc.lat, loc.lng)}
                >
                  <Text style={styles.quickLocationText}>{loc.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      )}

      {/* Selected Location Display */}
      {selectedLocation && (
        <View style={styles.selectedContainer}>
          <View style={styles.selectedHeader}>
            <Ionicons name="checkmark-circle" size={24} color="#16a34a" />
            <Text style={styles.selectedTitle}>{t('selectedLocation')}</Text>
          </View>
          <Text style={styles.selectedLabel} numberOfLines={2}>
            {selectedLocation.label}
          </Text>
          <Text style={styles.selectedCoords}>
            {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}
          </Text>
          <View style={styles.sourceTag}>
            <Text style={styles.sourceTagText}>
              {selectedLocation.source === 'gps' ? 'GPS' : 'MANUAL'}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 12,
  },
  modeContainer: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    gap: 4,
  },
  modeTabActive: {
    backgroundColor: '#16a34a',
  },
  modeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#16a34a',
  },
  modeTextActive: {
    color: '#fff',
  },
  modeContent: {
    minHeight: 100,
  },
  gpsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16a34a',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  gpsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1f2937',
  },
  resultsList: {
    maxHeight: 200,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    gap: 8,
  },
  resultText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  popularContainer: {
    marginTop: 8,
  },
  popularTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
  },
  popularItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 8,
  },
  popularText: {
    fontSize: 14,
    color: '#374151',
  },
  mapPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#bbf7d0',
    borderStyle: 'dashed',
  },
  mapPlaceholderText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },
  quickLocations: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 16,
    gap: 8,
  },
  quickLocationBtn: {
    backgroundColor: '#16a34a',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  quickLocationText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  selectedContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#86efac',
  },
  selectedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  selectedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#16a34a',
  },
  selectedLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 4,
  },
  selectedCoords: {
    fontSize: 12,
    color: '#6b7280',
  },
  sourceTag: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#16a34a',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  sourceTagText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
});
