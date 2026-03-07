// Types for Ireland Travel App
// Synchronized with backend models.py

export type StartSourceType = 'gps' | 'manual';
export type TravelMode = 'walk' | 'public_transport' | 'car';
export type TimePreset = '30m' | '60m' | '90m' | '2h' | '4h' | '1d';
export type Pace = 'relaxed' | 'normal' | 'fast';
export type TripStatus = 'preview' | 'approved' | 'in_progress' | 'completed' | 'cancelled';
export type StopStatus = 'available' | 'locked' | 'completed' | 'skipped';
export type Language = 'en' | 'ga';
export type Interest = 'history' | 'nature' | 'museums_indoor' | 'viewpoints';

// Keep old aliases for backwards compat with components that use them
export type TravelModeType = TravelMode;
export type TimePresetType = TimePreset;
export type PaceType = Pace;
export type TripStatusType = TripStatus;
export type StopStatusType = StopStatus;
export type LanguageType = Language;
export type StartLocationSource = StartSourceType;

export interface Location {
  lat: number;
  lng: number;
}

export interface GeoLocation {
  label: string;
  lat: number;
  lng: number;
  source: string;
}

export interface UserSettings {
  language: Language;
  interests: Interest[];
  travel_mode: TravelMode;
  budget_free_only: boolean;
  max_entry_fee: number;
  wheelchair_friendly: boolean;
  low_incline: boolean;
  pace: Pace;
  safety_sensitive: boolean;
  last_start_location?: {
    label?: string;
    lat?: number;
    lng?: number;
  };
  // Legacy field aliases for backward compat
  budget_max_entry?: number | null;
  accessibility_wheelchair?: boolean;
  accessibility_low_incline?: boolean;
  safety_filter_risky?: boolean;
  last_start_label?: string | null;
  last_start_lat?: number | null;
  last_start_lng?: number | null;
  exclude_visited?: boolean;
}

export interface User {
  id: string;
  session_id?: string;
  device_id?: string;
  is_guest: boolean;
  settings: UserSettings;
  total_points: number;
  created_at: string;
}

export interface POI {
  id: string;
  name_en: string;
  name_ga?: string;
  description_en?: string;
  description_ga?: string;
  location: Location;
  categories?: Interest[];
  category?: string;
  opening_hours?: string;
  entry_fee?: number;
  is_free?: boolean;
  wheelchair_accessible: boolean;
  coastal_cliff?: boolean;
  safety_warnings?: string[];
}

export interface ExperiencePack {
  title_en?: string;
  title_ga?: string;
  content_en?: string;
  content_ga?: string;
  welcome_message?: string;
  welcome_message_ga?: string;
  fun_facts: Array<string | { en: string; ga?: string }>;
  fun_facts_ga?: string[];
  photo_tips?: string[];
  local_phrases?: { english: string; irish: string; pronunciation: string }[];
  safety_tips?: string[];
  safety_notes?: string[];
  nearby_tip?: string;
  source_backed?: boolean;
}

export interface Stop {
  id: string;
  trip_id: string;
  poi_id: string;
  poi?: POI;
  poi_name?: string;
  poi_name_ga?: string;
  lat?: number;
  lng?: number;
  order: number;
  status: StopStatus;
  estimated_duration_min: number;
  eta_from_previous_min: number;
  eta_minutes?: number;
  distance_meters?: number;
  experience_pack?: ExperiencePack;
  completed_at?: string;
  completion_time?: string;    // set by backend after check-in, before photo upload
  completion_photo?: string;
  completion_photo_url?: string;
  completion_photo_base64?: string;
  points_awarded: number;
  is_currently_open?: boolean;
}

export interface Trip {
  id: string;
  user_id: string;
  status: TripStatus;
  start_location: Location;
  start_lat?: number;
  start_lng?: number;
  start_label?: string;
  start_source?: StartSourceType;
  travel_mode: TravelMode;
  time_preset: TimePreset;
  interests: Interest[];
  total_stops: number;
  completed_stops: number;
  total_points: number;
  total_points_possible?: number;
  stops: Stop[];
  total_distance_meters?: number;
  estimated_duration_minutes?: number;
  points_earned?: number;
  weather_summary?: any;
  warnings?: string[];
  events?: any[];
  preview_data?: any;
  created_at: string;
  budget_free_only?: boolean;
  budget_max_entry?: number;
  accessibility_wheelchair?: boolean;
  pace?: Pace;
}

export interface EstimatedStop {
  name: string;
  category: string;
  estimated_duration_min: number;
  entry_fee: number;
}

export interface LivePreview {
  weather: {
    temperature_c: number;
    condition: string;
    condition_ga?: string;
    wind_speed_kmh: number;
    precipitation_chance?: number;
    warnings: string[];
  };
  events: any[];
  estimated_stops: number;
  estimated_duration_min: number;
  warnings: string[];
  estimated_stop_details?: EstimatedStop[];
}

export interface Reward {
  id: string;
  name_en: string;       // backend field
  name_ga?: string;
  description_en: string; // backend field
  description_ga?: string;
  points_required: number;
  category: string;
  is_active?: boolean;
  image_url?: string;
  // Convenience aliases so legacy code still works
  name?: string;
  description?: string;
}

export interface VisitedPlace {
  id: string;
  user_id: string;
  place_id: string;
  name: string;
  lat: number;
  lng: number;
  visited_at: string;
  note?: string;
  photo_url?: string;
}

export type DamageReportStatus = 'pending' | 'approved' | 'rejected' | 'sent' | 'review_required' | 'failed' | 'dismissed';

export interface DamageReport {
  id: string;
  user_id: string;
  poi_id?: string;
  poi_name?: string;
  description: string;
  photo_url?: string;
  status: DamageReportStatus;
  created_at: string;
  severity: string;
  classification?: string;
  reviewer_notes?: string;
}
