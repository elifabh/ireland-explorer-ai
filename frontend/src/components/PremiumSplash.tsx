import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography } from '../theme';

const { width, height } = Dimensions.get('window');

interface PremiumSplashProps {
    onAnimationComplete?: () => void;
}

export function PremiumSplash({ onAnimationComplete }: PremiumSplashProps) {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.9)).current;
    const shamrockRotate = useRef(new Animated.Value(0)).current;
    const textRevealAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Initial entry animation
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 1000,
                useNativeDriver: false,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 8,
                tension: 40,
                useNativeDriver: false,
            }),
        ]).start();

        // Continuous shamrock rotation
        Animated.loop(
            Animated.timing(shamrockRotate, {
                toValue: 1,
                duration: 8000,
                useNativeDriver: false,
            })
        ).start();

        // Text reveal
        Animated.timing(textRevealAnim, {
            toValue: 1,
            duration: 800,
            delay: 500,
            useNativeDriver: false,
        }).start();

        // Auto-complete signal after minimum duration
        const timer = setTimeout(() => {
            if (onAnimationComplete) {
                onAnimationComplete();
            }
        }, 3000);

        return () => clearTimeout(timer);
    }, []);

    const rotate = shamrockRotate.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            <LinearGradient
                colors={['#022C22', '#064E3B', '#0F172A']}
                style={StyleSheet.absoluteFill}
            />

            {/* Decorative background elements */}
            <View style={styles.decorCircle1} />
            <View style={styles.decorCircle2} />

            <Animated.View style={[
                styles.content,
                { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }
            ]}>
                <View style={styles.logoContainer}>
                    <Animated.View style={{ transform: [{ rotate }] }}>
                        <Ionicons name="leaf" size={80} color={Colors.goldBright} />
                    </Animated.View>
                    <View style={styles.logoGlow} />
                </View>

                <Animated.View style={{
                    opacity: textRevealAnim, transform: [{
                        translateY: textRevealAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [20, 0]
                        })
                    }]
                }}>
                    <Text style={styles.title}>IRELAND</Text>
                    <Text style={[styles.title, styles.titleGold]}>EXPLORER</Text>

                    <View style={styles.taglineRow}>
                        <View style={styles.line} />
                        <Text style={styles.tagline}>BY CILLIAN AI</Text>
                        <View style={styles.line} />
                    </View>
                </Animated.View>
            </Animated.View>

            <View style={styles.footer}>
                <Text style={styles.footerText}>SLÁINTE & ADVENTURE</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#022C22',
    },
    content: {
        alignItems: 'center',
    },
    logoContainer: {
        marginBottom: 30,
        position: 'relative',
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoGlow: {
        position: 'absolute',
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: Colors.goldBright,
        opacity: 0.15,
        zIndex: -1,
    },
    title: {
        fontSize: 42,
        fontWeight: '900',
        color: Colors.white,
        letterSpacing: 4,
        textAlign: 'center',
        lineHeight: 46,
    },
    titleGold: {
        color: Colors.goldBright,
    },
    taglineRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginTop: 12,
        opacity: 0.8,
    },
    line: {
        height: 1,
        width: 30,
        backgroundColor: Colors.goldBright,
    },
    tagline: {
        color: Colors.white,
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 2,
    },
    footer: {
        position: 'absolute',
        bottom: 50,
    },
    footerText: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 10,
        fontWeight: '600',
        letterSpacing: 3,
    },
    decorCircle1: {
        position: 'absolute',
        top: -100,
        right: -100,
        width: 300,
        height: 300,
        borderRadius: 150,
        backgroundColor: 'rgba(5, 150, 105, 0.1)',
    },
    decorCircle2: {
        position: 'absolute',
        bottom: -50,
        left: -80,
        width: 250,
        height: 250,
        borderRadius: 125,
        backgroundColor: 'rgba(217, 119, 6, 0.05)',
    },
});
