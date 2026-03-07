/**
 * Shared UI Components — Ireland Explorer Design System
 */
import React, { useRef, useEffect } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet, Animated,
    ViewStyle, TextStyle, ActivityIndicator, Platform, StyleProp,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Gradients, Typography, Spacing, Radius, Shadow } from '../theme';
import * as Haptics from 'expo-haptics';

// ─────────────────────────────────────────────────────────────────────────────
// GradientCard
// ─────────────────────────────────────────────────────────────────────────────
export function GradientCard({
    children,
    style,
    colors = ['#FFFFFF', '#F0FDF4'],
    noPadding = false,
}: {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    colors?: readonly [string, string, ...string[]];
    noPadding?: boolean;
}) {
    return (
        <LinearGradient
            colors={colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[uiStyles.gradientCard, !noPadding && uiStyles.cardPadding, Shadow.md, style]}
        >
            {children}
        </LinearGradient>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// PrimaryButton — gradient with optional pulse animation
// ─────────────────────────────────────────────────────────────────────────────
export function PrimaryButton({
    label,
    onPress,
    disabled = false,
    loading = false,
    icon,
    style,
    pulse = false,
}: {
    label: string;
    onPress: () => void;
    disabled?: boolean;
    loading?: boolean;
    icon?: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    pulse?: boolean;
}) {
    const scale = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (pulse && !disabled) {
            const loop = Animated.loop(
                Animated.sequence([
                    Animated.timing(scale, { toValue: 1.04, duration: 800, useNativeDriver: true }),
                    Animated.timing(scale, { toValue: 1, duration: 800, useNativeDriver: true }),
                ])
            );
            loop.start();
            return () => loop.stop();
        }
    }, [pulse, disabled]);

    const onPressIn = () =>
        Animated.spring(scale, { toValue: 0.96, useNativeDriver: true }).start();
    const onPressOut = () =>
        Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();

    return (
        <ScaleOnPress onPress={onPress} disabled={disabled || loading} scaleTo={0.97}>
            <LinearGradient
                colors={disabled ? ['#94A3B8', '#64748B'] : ['#059669', '#064E3B']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={uiStyles.primaryBtn}
            >
                {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                ) : (
                    <Animated.View style={[
                        styles.btnContent,
                        pulse && { transform: [{ scale }] }
                    ]}>
                        {icon}
                        <Text style={uiStyles.primaryBtnText}>{label}</Text>
                    </Animated.View>
                )}
            </LinearGradient>
        </ScaleOnPress>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// GlassCard — glassmorphism card
// ─────────────────────────────────────────────────────────────────────────────
export function GlassCard({
    children,
    style,
    intensity = 40,
}: {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    intensity?: number;
}) {
    return (
        <View style={[uiStyles.glassOuter, style]}>
            <BlurView intensity={intensity} tint="dark" style={uiStyles.glassInner}>
                {children}
            </BlurView>
        </View>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// SectionHeader — gradient underline heading
// ─────────────────────────────────────────────────────────────────────────────
export function SectionHeader({ title, style }: { title: string; style?: StyleProp<ViewStyle> }) {
    return (
        <View style={[uiStyles.sectionHeader, style]}>
            <Text style={uiStyles.sectionTitle}>{title}</Text>
            <LinearGradient
                colors={['#059669', '#D97706']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={uiStyles.sectionUnderline}
            />
        </View>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// StatusBadge — colored pill
// ─────────────────────────────────────────────────────────────────────────────
export function StatusBadge({
    label,
    color = Colors.success,
    textColor = '#fff',
}: {
    label: string;
    color?: string;
    textColor?: string;
}) {
    return (
        <View style={[uiStyles.badge, { backgroundColor: color }]}>
            <Text style={[uiStyles.badgeText, { color: textColor }]}>{label}</Text>
        </View>
    );
}

export function AnimatedEntry({
    children,
    delay = 0,
    style,
    type = 'slide'
}: {
    children: React.ReactNode;
    delay?: number;
    style?: StyleProp<ViewStyle>;
    type?: 'slide' | 'fade';
}) {
    const opacity = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(type === 'fade' ? 0 : 20)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(opacity, {
                toValue: 1,
                duration: 600,
                delay,
                useNativeDriver: true,
            }),
            Animated.timing(translateY, {
                toValue: 0,
                duration: 600,
                delay,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    return (
        <Animated.View style={[{ opacity, transform: [{ translateY }] }, style]}>
            {children}
        </Animated.View>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// PointsPill — animated points display
// ─────────────────────────────────────────────────────────────────────────────
export function PointsPill({ points }: { points: number }) {
    return (
        <LinearGradient
            colors={['#D97706', '#F59E0B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={uiStyles.pointsPill}
        >
            <Text style={uiStyles.pointsPillText}>⭐ {points} pts</Text>
        </LinearGradient>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// ThemedHeader — reusable deep emerald gradient header
// ─────────────────────────────────────────────────────────────────────────────
export function ThemedHeader({
    title,
    subtitle,
    onBack,
    rightComponent,
    style,
}: {
    title: string;
    subtitle?: string;
    onBack?: () => void;
    rightComponent?: React.ReactNode;
    style?: StyleProp<ViewStyle>;
}) {
    return (
        <LinearGradient
            colors={['#022C22', '#065F46']}
            style={[uiStyles.themedHeader, style]}
        >
            <SafeAreaView edges={['top']}>
                <View style={uiStyles.headerRow}>
                    {onBack ? (
                        <TouchableOpacity style={uiStyles.headerIconBtn} onPress={onBack}>
                            <Ionicons name="arrow-back" size={20} color="#fff" />
                        </TouchableOpacity>
                    ) : <View style={{ width: 38 }} />}

                    <View style={uiStyles.headerCenter}>
                        <Text style={uiStyles.headerTitle} numberOfLines={1}>{title}</Text>
                        {subtitle && <Text style={uiStyles.headerSubtitle}>{subtitle}</Text>}
                    </View>

                    {rightComponent ? (
                        <View style={uiStyles.headerRight}>{rightComponent}</View>
                    ) : <View style={{ width: 38 }} />}
                </View>
            </SafeAreaView>
        </LinearGradient>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// IconCircle — small themed background for icons
// ─────────────────────────────────────────────────────────────────────────────
export function IconCircle({
    icon,
    color,
    bgColor,
    size = 20,
    containerSize = 38,
    style,
}: {
    icon: any; // Ionicons name
    color: string;
    bgColor: string;
    size?: number;
    containerSize?: number;
    style?: StyleProp<ViewStyle>;
}) {
    return (
        <View style={[
            uiStyles.iconCircle,
            { width: containerSize, height: containerSize, borderRadius: 12, backgroundColor: bgColor },
            style
        ]}>
            <Ionicons name={icon} size={size} color={color} />
        </View>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// ThemedCard — premium white card with shadow
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// ScaleOnPress — reusable wrapper for touch feedback
// ─────────────────────────────────────────────────────────────────────────────
export function ScaleOnPress({
    children,
    onPress,
    disabled,
    scaleTo = 0.96,
    haptic = true,
    style,
}: {
    children: React.ReactNode;
    onPress?: () => void;
    disabled?: boolean;
    scaleTo?: number;
    haptic?: boolean;
    style?: StyleProp<ViewStyle>;
}) {
    const scale = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        if (!disabled) {
            Animated.spring(scale, { toValue: scaleTo, useNativeDriver: true }).start();
            if (haptic) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
        }
    };

    const handlePressOut = () => {
        if (!disabled) {
            Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
        }
    };

    return (
        <TouchableOpacity
            activeOpacity={1}
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={disabled}
            style={style}
        >
            <Animated.View style={[{ transform: [{ scale }] }]}>
                {children}
            </Animated.View>
        </TouchableOpacity>
    );
}

export function ThemedCard({
    children,
    style,
    onPress,
}: {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    onPress?: () => void;
}) {
    const CardContent = (
        <View style={[uiStyles.themedCard, style]}>
            {children}
        </View>
    );

    if (onPress) {
        return (
            <ScaleOnPress onPress={onPress}>
                {CardContent}
            </ScaleOnPress>
        );
    }
    return CardContent;
}


// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const uiStyles = StyleSheet.create({
    gradientCard: {
        borderRadius: Radius.lg,
        overflow: 'hidden',
    },
    cardPadding: {
        padding: Spacing.base,
    },
    primaryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: Radius.lg,
    },
    btnContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    primaryBtnText: {
        color: Colors.white,
        fontSize: Typography.md,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    glassOuter: {
        borderRadius: Radius.lg,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: Colors.glassWhite,
    },
    glassInner: {
        padding: Spacing.base,
    },
    sectionHeader: {
        marginBottom: Spacing.md,
    },
    sectionTitle: {
        fontSize: Typography.lg,
        fontWeight: '700',
        color: Colors.dark,
        marginBottom: 4,
    },
    sectionUnderline: {
        height: 3,
        width: 48,
        borderRadius: 2,
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: Radius.full,
        alignSelf: 'flex-start',
    },
    badgeText: {
        fontSize: Typography.xs,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    pointsPill: {
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: Radius.full,
        alignSelf: 'flex-start',
    },
    pointsPillText: {
        color: Colors.white,
        fontWeight: '700',
        fontSize: Typography.sm,
    },
    themedHeader: {
        paddingBottom: Spacing.base,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.base,
        paddingTop: Platform.OS === 'android' ? 40 : Spacing.sm,
        minHeight: 64,
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: Typography.md,
        fontWeight: '800',
        color: '#fff',
        textAlign: 'center',
    },
    headerSubtitle: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.7)',
        marginTop: 2,
    },
    headerIconBtn: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerRight: {
        minWidth: 38,
    },
    iconCircle: {
        justifyContent: 'center',
        alignItems: 'center',
        ...Shadow.sm,
    },
    themedCard: {
        backgroundColor: '#fff',
        borderRadius: Radius.xl,
        padding: Spacing.base,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        ...Shadow.md,
    },
});

export const styles = uiStyles;
