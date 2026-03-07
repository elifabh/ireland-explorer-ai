import { Language } from '../store/appStore';

export const translations: Record<string, Record<Language, string>> = {
  // General
  'appName': {
    en: 'Ireland Explorer',
    ga: 'Taiscéalaí Éireann'
  },
  'tagline': {
    en: 'Your AI Travel Companion',
    ga: 'Do Chompánach Taistil AI'
  },
  'loading': {
    en: 'Loading...',
    ga: 'Ag lódáil...'
  },
  'getStarted': {
    en: 'Get Started',
    ga: 'Tosaigh'
  },
  'points': {
    en: 'Points',
    ga: 'Pointí'
  },
  'stops': {
    en: 'Stops',
    ga: 'Stadanna'
  },
  'rewards': {
    en: 'Rewards',
    ga: 'Duaiseanna'
  },
  'settings': {
    en: 'Settings',
    ga: 'Socruithe'
  },
  'trips': {
    en: 'Trips',
    ga: 'Turais'
  },
  'home': {
    en: 'Home',
    ga: 'Baile'
  },
  'route': {
    en: 'Route',
    ga: 'Bealach'
  },

  // Home Screen
  'home.welcome': {
    en: 'Welcome to Ireland!',
    ga: 'Fáilte go hÉirinn!'
  },
  'home.startJourney': {
    en: 'Start Your Journey',
    ga: 'Tosaigh do Thuras'
  },
  'home.selectTime': {
    en: 'How much time do you have?',
    ga: 'Cé mhéad ama atá agat?'
  },
  'home.preview': {
    en: 'Preview Route',
    ga: 'Réamhamharc ar Bhealach'
  },
  'home.yourLocation': {
    en: 'Your Location',
    ga: 'Do Shuíomh'
  },
  'home.getLocation': {
    en: 'Get My Location',
    ga: 'Faigh Mo Shuíomh'
  },

  // Time Presets
  'time.30m': {
    en: '30 minutes',
    ga: '30 nóiméad'
  },
  'time.60m': {
    en: '1 hour',
    ga: '1 uair'
  },
  'time.90m': {
    en: '1.5 hours',
    ga: '1.5 uair'
  },
  'time.2h': {
    en: '2 hours',
    ga: '2 uair'
  },
  'time.4h': {
    en: '4 hours',
    ga: '4 uair'
  },
  'time.1d': {
    en: 'Full day',
    ga: 'Lá iomlán'
  },

  // Preview
  'preview.title': {
    en: 'Route Preview',
    ga: 'Réamhamharc Bealach'
  },
  'preview.weather': {
    en: 'Weather',
    ga: 'Aimsir'
  },
  'preview.stops': {
    en: 'Estimated Stops',
    ga: 'Stadanna Measta'
  },
  'preview.duration': {
    en: 'Duration',
    ga: 'Fad'
  },
  'preview.startTrip': {
    en: 'Start Adventure!',
    ga: 'Tosaigh an Eachtra!'
  },
  'preview.cancel': {
    en: 'Cancel',
    ga: 'Cealaigh'
  },

  // Route Screen
  'route.title': {
    en: 'Your Route',
    ga: 'Do Bhealach'
  },
  'route.noTrip': {
    en: 'No active trip',
    ga: 'Níl turas gníomhach'
  },
  'route.startTrip': {
    en: 'Create a trip from Home',
    ga: 'Cruthaigh turas ó Bhaile'
  },
  'route.completed': {
    en: 'Completed!',
    ga: 'Críochnaithe!'
  },
  'route.locked': {
    en: 'Locked',
    ga: 'Faoi Ghlas'
  },
  'route.unlocked': {
    en: 'Ready to visit!',
    ga: 'Réidh le cuairt!'
  },
  'route.next': {
    en: 'Next Stop',
    ga: 'An Chéad Stad Eile'
  },

  // Stop Detail
  'stop.checkIn': {
    en: 'Check In',
    ga: 'Seiceáil Isteach'
  },
  'stop.takePhoto': {
    en: 'Take Photo',
    ga: 'Tóg Grianghraf'
  },
  'stop.complete': {
    en: 'Complete Stop',
    ga: 'Críochnaigh Stad'
  },
  'stop.funFacts': {
    en: 'Fun Facts',
    ga: 'Fíricí Spraíúla'
  },
  'stop.safetyNotes': {
    en: 'Safety Notes',
    ga: 'Nótaí Sábháilteachta'
  },
  'stop.eta': {
    en: 'min walk',
    ga: 'nóim siúl'
  },
  'stop.duration': {
    en: 'min visit',
    ga: 'nóim cuairt'
  },

  // Points Screen
  'points.title': {
    en: 'Your Points',
    ga: 'Do Pointí'
  },
  'points.total': {
    en: 'Total Points',
    ga: 'Iomlán Pointí'
  },
  'points.rewards': {
    en: 'Rewards (DEMO)',
    ga: 'Duaiseanna (TAISPEÁNTAS)'
  },
  'points.redeem': {
    en: 'Redeem',
    ga: 'Athfhorghníomhú'
  },
  'points.claimed': {
    en: 'Claimed!',
    ga: 'Éilithe!'
  },
  'points.notEnough': {
    en: 'Not enough points',
    ga: 'Níl go leor pointí'
  },

  // Profile Screen
  'profile.title': {
    en: 'Profile & Settings',
    ga: 'Próifíl & Socruithe'
  },
  'profile.language': {
    en: 'Language',
    ga: 'Teanga'
  },
  'profile.interests': {
    en: 'Interests',
    ga: 'Spéiseanna'
  },
  'profile.travelMode': {
    en: 'Travel Mode',
    ga: 'Mód Taistil'
  },
  'profile.pace': {
    en: 'Pace',
    ga: 'Luas'
  },
  'profile.accessibility': {
    en: 'Accessibility',
    ga: 'Inrochtaineacht'
  },
  'profile.wheelchair': {
    en: 'Wheelchair Friendly',
    ga: 'Oiriúnach do Chathaoir Rothaí'
  },
  'profile.safety': {
    en: 'Safety Filters',
    ga: 'Scagairí Sábháilteachta'
  },
  'profile.avoidCliffs': {
    en: 'Avoid coastal cliffs',
    ga: 'Seachain aillte cósta'
  },
  'profile.budget': {
    en: 'Budget',
    ga: 'Buiséad'
  },
  'profile.freeOnly': {
    en: 'Free attractions only',
    ga: 'Áiteanna saor in aisce amháin'
  },

  // Interests
  'interest.history': {
    en: 'History',
    ga: 'Stair'
  },
  'interest.nature': {
    en: 'Nature',
    ga: 'Nádúr'
  },
  'interest.museums_indoor': {
    en: 'Museums',
    ga: 'Músaeim'
  },
  'interest.viewpoints': {
    en: 'Viewpoints',
    ga: 'Radhairc'
  },

  // Travel Modes
  'mode.walk': {
    en: 'Walking',
    ga: 'Ag Siúl'
  },
  'mode.public_transport': {
    en: 'Public Transport',
    ga: 'Iompar Poiblí'
  },
  'mode.car': {
    en: 'Car',
    ga: 'Carr'
  },

  // Pace
  'pace.relaxed': {
    en: 'Relaxed',
    ga: 'Suaimhneach'
  },
  'pace.normal': {
    en: 'Normal',
    ga: 'Gnáth'
  },
  'pace.fast': {
    en: 'Fast',
    ga: 'Tapa'
  },

  // Errors
  'error.location': {
    en: 'Could not get your location',
    ga: 'Ní féidir do shuíomh a fháil'
  },
  'error.generic': {
    en: 'Something went wrong',
    ga: 'Chuaigh rud éigin amú'
  },

  // Success messages
  'success.checkIn': {
    en: 'Check-in successful!',
    ga: 'Seiceáil isteach rathúil!'
  },
  'success.tripComplete': {
    en: 'Trip completed! Well done!',
    ga: 'Turas críochnaithe! Maith thú!'
  }
};

export const t = (key: string, lang: Language): string => {
  return translations[key]?.[lang] || translations[key]?.en || key;
};

export const getLocalizedName = (nameEn: string, nameGa: string | undefined, lang: Language): string => {
  if (lang === 'ga' && nameGa) {
    return nameGa;
  }
  return nameEn;
};

export const getLocalizedContent = (contentEn: string, contentGa: string | undefined, lang: Language): string => {
  if (lang === 'ga' && contentGa) {
    return contentGa;
  }
  return contentEn;
};
