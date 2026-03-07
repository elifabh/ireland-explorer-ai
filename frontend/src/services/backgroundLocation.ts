import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
// import * as Notifications from 'expo-notifications'; // KAPATILDI: Expo Go desteklemiyor
import { api } from './api';

const LOCATION_TASK_NAME = 'background-location-task';

// Bildirim izinlerini atlayip sadece konum izni isteyecegiz
export const requestPermissions = async () => {
  const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
  if (foregroundStatus !== 'granted') {
    console.log('Foreground location permission denied');
    return false;
  }

  const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
  if (backgroundStatus !== 'granted') {
    console.log('Background location permission denied');
    return false;
  }

  // await Notifications.requestPermissionsAsync(); // KAPATILDI
  return true;
};

export const startBackgroundUpdate = async () => {
  const hasPermissions = await requestPermissions();
  if (!hasPermissions) {
    console.log("İzinler eksik, baslatilamadi.");
    return;
  }

  // Bildirim ayarlama kismini kapattik
  /*
  await Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
  */

  await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 60000, // 1 dakika
    distanceInterval: 100, // 100 metre
    foregroundService: {
      notificationTitle: "Trip Tracking Active",
      notificationBody: "We are tracking your trip progress",
    },
  });

  console.log("Arka plan takibi baslatildi.");
};

export const stopBackgroundUpdate = async () => {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
  if (isRegistered) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    console.log("Arka plan takibi durduruldu.");
  }
};

// Convenience object for importing as { backgroundLocation }
export const backgroundLocation = {
  requestPermissions,
  start: startBackgroundUpdate,
  stop: stopBackgroundUpdate,
};

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Location task error:', error);
    return;
  }
  if (data) {
    const { locations } = data as any;
    const location = locations[0];

    if (location) {
      console.log('Arka plan konumu:', location.coords);

      // Backend'e gonderme denemesi
      try {
        /* await api.post('/trip/update-location', {
           lat: location.coords.latitude,
           lng: location.coords.longitude
        });
        */
        console.log("Konum backend'e gonderilmeye hazir (API kapali).");
      } catch (err) {
        console.error('API Error:', err);
      }
    }
  }
});