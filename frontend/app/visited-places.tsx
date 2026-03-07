import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Image,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../src/context/AppContext';
import { api } from '../src/services/api';
import { offlineStorage } from '../src/services/offlineStorage';
import { VisitedPlace } from '../src/types';

export default function VisitedPlacesScreen() {
  const router = useRouter();
  const { user, language } = useApp();
  const [places, setPlaces] = useState<VisitedPlace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingPlace, setEditingPlace] = useState<VisitedPlace | null>(null);
  const [noteText, setNoteText] = useState('');

  useEffect(() => {
    loadPlaces();
  }, [user]);

  const loadPlaces = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      // Try network first, fall back to offline cache
      const data = await api.getVisitedPlaces(user.id);
      setPlaces(data);
      await offlineStorage.saveVisitedPlaces(data);
    } catch (error) {
      console.warn('Network failed, loading visited places from cache');
      try {
        const cached = await offlineStorage.getVisitedPlaces();
        setPlaces(cached);
      } catch {
        console.error('Failed to load visited places from cache');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (placeId: string) => {
    if (!user) return;
    try {
      await api.removeVisitedPlace(user.id, placeId);
      const updated = places.filter(p => p.place_id !== placeId);
      setPlaces(updated);
      await offlineStorage.saveVisitedPlaces(updated);
    } catch (error) {
      Alert.alert('Error', 'Failed to delete place');
    }
  };

  const handleEditNote = (place: VisitedPlace) => {
    setEditingPlace(place);
    setNoteText(place.note || '');
  };

  const saveNote = async () => {
    if (!user || !editingPlace) return;
    try {
      const updated = await api.updateVisitedPlace(user.id, editingPlace.place_id, {
        note: noteText
      });
      const newPlaces = places.map(p => p.place_id === editingPlace.place_id ? updated : p);
      setPlaces(newPlaces);
      await offlineStorage.saveVisitedPlaces(newPlaces);
      setEditingPlace(null);
    } catch (error) {
      Alert.alert('Error', 'Failed to update note');
    }
  };

  const renderItem = ({ item }: { item: VisitedPlace }) => (
    <View style={styles.card}>
      <View style={styles.cardContent}>
        {item.photo_url ? (
          <Image source={{ uri: item.photo_url }} style={styles.thumbnail} />
        ) : (
          <View style={styles.iconPlaceholder}>
            <Ionicons name="location" size={24} color="#fff" />
          </View>
        )}
        <View style={styles.info}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.date}>
            {language === 'ga' ? 'Cuairt ar' : 'Visited on'}{' '}
            {new Date(item.visited_at).toLocaleDateString()}
          </Text>
          {item.note ? (
            <Text style={styles.note} numberOfLines={2}>"{item.note}"</Text>
          ) : (
            <Text style={styles.placeholderNote}>No note added</Text>
          )}
        </View>
        <TouchableOpacity onPress={() => handleEditNote(item)} style={styles.editBtn}>
          <Ionicons name="create-outline" size={20} color="#6b7280" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => Alert.alert('Delete', 'Remove this place?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => handleDelete(item.place_id) }
          ])}
          style={styles.deleteBtn}
        >
          <Ionicons name="trash-outline" size={20} color="#dc2626" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Visited Places</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#16a34a" />
        </View>
      ) : (
        <FlatList
          data={places}
          renderItem={renderItem}
          keyExtractor={(item) => item.place_id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="map-outline" size={48} color="#9ca3af" />
              <Text style={styles.emptyText}>No places visited yet.</Text>
            </View>
          }
        />
      )}

      {/* Edit Note Modal */}
      <Modal visible={!!editingPlace} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Note</Text>
            <TextInput
              style={styles.noteInput}
              value={noteText}
              onChangeText={setNoteText}
              multiline
              placeholder="Add a personal note..."
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setEditingPlace(null)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.saveBtn]}
                onPress={saveNote}
              >
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    overflow: 'hidden',
  },
  cardContent: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'center',
    gap: 12,
  },
  thumbnail: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#e5e7eb',
  },
  iconPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#16a34a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  date: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  note: {
    fontSize: 13,
    color: '#4b5563',
    fontStyle: 'italic',
  },
  placeholderNote: {
    fontSize: 13,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  editBtn: {
    padding: 8,
  },
  deleteBtn: {
    padding: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#9ca3af',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 16,
  },
  noteInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    height: 100,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: '#f3f4f6',
  },
  saveBtn: {
    backgroundColor: '#16a34a',
  },
  cancelBtnText: {
    color: '#4b5563',
    fontWeight: '600',
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
});
