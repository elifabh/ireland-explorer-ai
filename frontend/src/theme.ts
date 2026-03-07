/**
 * Ireland Explorer — Global Design System
 * Inspired by Ireland's lush landscapes, ancient stone, Celtic gold
 */

export const Colors = {
    // Primary — Deep Emerald
    emerald: '#064E3B',
    emeraldMid: '#065F46',
    emeraldBright: '#059669',
    emeraldLight: '#D1FAE5',

    // Accent — Celtic Gold
    gold: '#D97706',
    goldLight: '#FDE68A',
    goldBright: '#F59E0B',

    // Night — Deep Navy
    navy: '#0F172A',
    navyMid: '#1E293B',
    navyLight: '#334155',

    // Neutrals
    white: '#FFFFFF',
    offWhite: '#F8FAFC',
    mist: '#E2E8F0',
    slate: '#64748B',
    dark: '#1E293B',

    // Status
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    info: '#3B82F6',

    // Translucent (glassmorphism)
    glassWhite: 'rgba(255,255,255,0.12)',
    glassWhiteStrong: 'rgba(255,255,255,0.22)',
    glassDark: 'rgba(6,78,59,0.7)',
    glassNavy: 'rgba(15,23,42,0.75)',
    blackOverlay: 'rgba(0,0,0,0.5)',
};

export const Gradients = {
    // Primary hero gradient — deep emerald to teal
    emerald: ['#022C22', '#064E3B', '#065F46'] as const,
    // Warm card gradient
    card: ['#F0FDF4', '#ECFDF5'] as const,
    // Gold accent
    gold: ['#92400E', '#D97706', '#F59E0B'] as const,
    // Night mode
    night: ['#0F172A', '#1E293B', '#0F2942'] as const,
    // Success
    success: ['#064E3B', '#059669'] as const,
    // Map overlay panel
    mapPanel: ['rgba(6,78,59,0.95)', 'rgba(6,78,59,0.75)'] as const,
    // Reward shimmer
    shimmer: ['#FEF3C7', '#FDE68A', '#FEF3C7'] as const,
    // Transparent bottom fade
    bottomFade: ['transparent', 'rgba(15,23,42,0.9)'] as const,
};

export const Typography = {
    // Font families — loaded via expo-font
    heading: 'Inter_700Bold',
    subheading: 'Inter_600SemiBold',
    body: 'Inter_400Regular',
    bodyMedium: 'Inter_500Medium',
    caption: 'Inter_400Regular',

    // Sizes
    xs: 11,
    sm: 13,
    base: 15,
    md: 17,
    lg: 20,
    xl: 24,
    xxl: 30,
    xxxl: 38,
};

export const Spacing = {
    xs: 4,
    sm: 8,
    md: 12,
    base: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
    xxxl: 48,
};

export const Radius = {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 999,
};

export const Shadow = {
    sm: {
        shadowColor: '#064E3B',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.10,
        shadowRadius: 4,
        elevation: 2,
    },
    md: {
        shadowColor: '#064E3B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
    },
    lg: {
        shadowColor: '#022C22',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.20,
        shadowRadius: 16,
        elevation: 10,
    },
    gold: {
        shadowColor: '#D97706',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.30,
        shadowRadius: 12,
        elevation: 6,
    },
};
