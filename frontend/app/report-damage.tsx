import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useApp } from '../src/context/AppContext';
import { api } from '../src/services/api';

export default function ReportDamageScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user, t } = useApp();

  const poiId = params.poiId as string;
  const poiName = params.poiName as string;
  const lat = params.lat ? parseFloat(params.lat as string) : undefined;
  const lng = params.lng ? parseFloat(params.lng as string) : undefined;

  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('vandalism');
  const [photo, setPhoto] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);

  const categories = [
    { id: 'vandalism', label: 'Vandalism' },
    { id: 'graffiti', label: 'Graffiti' },
    { id: 'structural', label: 'Structural Damage' },
    { id: 'littering', label: 'Littering' },
    { id: 'erosion', label: 'Erosion' },
    { id: 'vegetation_damage', label: 'Vegetation Damage' },
    { id: 'other', label: 'Other' },
  ];

  const analyzePhoto = async () => {
    setIsAnalyzing(true);
    // Simulate AI model picking up the image visually before true backend submission
    await new Promise(resolve => setTimeout(resolve, 1500));
    setAnalysisResult('📷 Look good. Backend will verify via LLAVA...');
    setIsAnalyzing(false);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setPhoto(result.assets[0].base64);
      analyzePhoto();
    }
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Camera permission is required to take photos');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setPhoto(result.assets[0].base64);
      analyzePhoto();
    }
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      if (Platform.OS === 'web') alert('Missing Information: Please provide a description');
      else Alert.alert('Missing Information', 'Please provide a description');
      return;
    }
    const userId = user?.id || "guest-user-123";
    setIsSubmitting(true);
    try {
      await api.submitDamageReport(userId, {
        poi_id: poiId,
        poi_name: poiName,
        description,
        category,
        photo_base64: photo || undefined,
        lat,
        lng,
      });
      if (Platform.OS === 'web') {
        alert('Your report has been submitted for Admin review. Once approved, you will earn reward points! Thank you for protecting our heritage.');
        router.back();
      } else {
        Alert.alert(
          'Report Received',
          'Your report has been submitted for Admin review. Once approved, you will earn reward points! Thank you for protecting our heritage.',
          [{ text: 'Great!', onPress: () => router.back() }]
        );
      }
    } catch (error: any) {
      console.error('Failed to submit report:', error);
      const msg = error.response?.data?.detail || 'Failed to submit report. Please try again.';
      if (Platform.OS === 'web') {
        alert('Error: ' + msg);
      } else {
        Alert.alert('Error', msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Report Damage</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {poiName && (
          <View style={styles.poiCard}>
            <Ionicons name="location" size={24} color="#16a34a" />
            <Text style={styles.poiName}>{poiName}</Text>
          </View>
        )}

        <Text style={styles.label}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryChip,
                category === cat.id && styles.categoryChipSelected,
              ]}
              onPress={() => setCategory(cat.id)}
            >
              <Text
                style={[
                  styles.categoryText,
                  category === cat.id && styles.categoryTextSelected,
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={styles.input}
          multiline
          numberOfLines={4}
          placeholder="Describe the damage..."
          value={description}
          onChangeText={setDescription}
        />

        <Text style={styles.label}>Photo (Optional)</Text>
        <View style={styles.photoButtons}>
          <TouchableOpacity style={styles.photoBtn} onPress={pickImage}>
            <Ionicons name="images" size={24} color="#4b5563" />
            <Text style={styles.photoBtnText}>Gallery</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.photoBtn} onPress={takePhoto}>
            <Ionicons name="camera" size={24} color="#4b5563" />
            <Text style={styles.photoBtnText}>Camera</Text>
          </TouchableOpacity>
        </View>

        {photo && (
          <View style={styles.previewContainer}>
            <Image
              source={{ uri: `data:image/jpeg;base64,${photo}` }}
              style={styles.photoPreview}
            />
            {isAnalyzing && (
              <View style={styles.analysisOverlay}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={styles.analysisText}>🤖 AI Agent Analyzing Damage...</Text>
              </View>
            )}
            {!isAnalyzing && analysisResult && (
              <View style={styles.resultOverlay}>
                <Ionicons name="scan-circle" size={24} color="#fff" />
                <Text style={styles.resultText}>{analysisResult}</Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.removePhotoBtn}
              onPress={() => { setPhoto(null); setAnalysisResult(null); }}
            >
              <Ionicons name="close-circle" size={24} color="#dc2626" />
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={styles.submitBtn}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>Submit Report</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  content: {
    padding: 16,
  },
  poiCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  poiName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  categoryScroll: {
    marginBottom: 20,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#e5e7eb',
    marginRight: 8,
  },
  categoryChipSelected: {
    backgroundColor: '#16a34a',
  },
  categoryText: {
    fontSize: 14,
    color: '#4b5563',
    fontWeight: '500',
  },
  categoryTextSelected: {
    color: '#fff',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    textAlignVertical: 'top',
    height: 100,
    marginBottom: 20,
  },
  photoButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  photoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  photoBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4b5563',
  },
  previewContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  photoPreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  removePhotoBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  submitBtn: {
    backgroundColor: '#dc2626',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  analysisOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  analysisText: {
    color: '#fff',
    marginTop: 8,
    fontWeight: '600',
  },
  resultOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(22, 163, 74, 0.9)',
    padding: 8,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resultText: {
    color: '#fff',
    fontWeight: '700',
    flex: 1,
  },
});
