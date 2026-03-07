import Constants from 'expo-constants';

const getBackendUrl = () => {
  if (process.env.EXPO_PUBLIC_BACKEND_URL) {
    return process.env.EXPO_PUBLIC_BACKEND_URL;
  }
  if (Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL) {
    return Constants.expoConfig.extra.EXPO_PUBLIC_BACKEND_URL;
  }
  return 'http://localhost:8000';
};

export const CONFIG = {
  API_URL: getBackendUrl(),
};
