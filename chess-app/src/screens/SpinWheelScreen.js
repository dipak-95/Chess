import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated, Easing, Alert, Modal, Image } from 'react-native';
import { Svg, Path, G, Text as SvgText, Circle, Polygon, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { COLORS, SHADOWS } from '../constants/theme';
import AppBackground from '../components/AppBackground';
import api from '../services/authService';

const { width } = Dimensions.get('window');
const WHEEL_SIZE = width * 0.95;
const CENTER = WHEEL_SIZE / 2;
const RADIUS = WHEEL_SIZE / 2 - 25;

// Updated Rewards based on image and request
// Colors matched to the uploaded image style (Purple/Gold/Pink/Teal/White)
const REWARDS = [
    { id: 0, amount: 250, color: '#8E44AD', label: '250', probability: 0.20 },  // Purple (20%)
    { id: 1, amount: 10, color: '#A569BD', label: '10', probability: 0.15 },    // Lighter Purple
    { id: 2, amount: 5000, color: '#E91E63', label: '5k', probability: 0.05 },  // Pink
    { id: 3, amount: 10000, color: '#F1C40F', label: '10k', probability: 0.01 }, // Gold (Jackpot)
    { id: 4, amount: 500, color: '#E74C3C', label: '500', probability: 0.10 },  // Red
    { id: 5, amount: 100, color: '#1ABC9C', label: '100', probability: 0.15 },  // Teal
    { id: 6, amount: 50, color: '#F39C12', label: '50', probability: 0.15 },    // Orange
    { id: 7, amount: 1000, color: '#2C3E50', label: '1k', probability: 0.04 },  // Dark Blue
    { id: 8, amount: 20, color: '#ECF0F1', label: '20', probability: 0.10 },    // Whiteish
    { id: 9, amount: 0, color: '#95A5A6', label: '0', probability: 0.05 }       // Basic Gray
];

const NUMBER_OF_SEGMENTS = REWARDS.length;
const ANGLE_PER_SEGMENT = 360 / NUMBER_OF_SEGMENTS;

const makeWheelPath = (index) => {
    const startAngle = index * ANGLE_PER_SEGMENT;
    const endAngle = (index + 1) * ANGLE_PER_SEGMENT;

    // Convert degrees to radians
    const startRad = (startAngle - 90) * Math.PI / 180;
    const endRad = (endAngle - 90) * Math.PI / 180;

    const x1 = CENTER + RADIUS * Math.cos(startRad);
    const y1 = CENTER + RADIUS * Math.sin(startRad);
    const x2 = CENTER + RADIUS * Math.cos(endRad);
    const y2 = CENTER + RADIUS * Math.sin(endRad);

    return `M${CENTER},${CENTER} L${x1},${y1} A${RADIUS},${RADIUS} 0 0,1 ${x2},${y2} Z`;
};

export default function SpinWheelScreen() {
    const spinValue = useRef(new Animated.Value(0)).current;
    const [isSpinning, setIsSpinning] = useState(false);
    const [resultModalVisible, setResultModalVisible] = useState(false);
    const [wonAmount, setWonAmount] = useState(0);

    const spin = async () => {
        if (isSpinning) return;
        setIsSpinning(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            // Fetch Result FIRST (so we know where to stop)
            const res = await api.post('/users/spin');
            // Backend returns index based on its own probability logic.
            // We must update backend probabilities to match frontend if we want sync,
            // but usually backend decides everything.
            // For now, we trust backend 'index' ensures the reward amount.
            // CAUTION: Backend rewards list mismatch will cause wrong visual.
            // I will assume backend is updated to match this new REWARDS list order.

            const { index, amount } = res.data;
            setWonAmount(amount);

            // Calculate Stop Angle
            // We want the winning segment center to align with the TOP (0 degrees).
            // Current visual setup: Segment 0 starts at 0 (top) and goes clockwise?
            // Actually my path logic: (startAngle - 90).
            // Index 0: starts at -90 (Top), ends at -90 + 36.
            // Center of Index 0 is at -90 + 18 = -72 degrees.
            // Wait, SVG coords 0,0 is top-left.
            // Let's rely on standard rotation: 0 degrees is usually 3 o'clock.
            // My path logic explicitly rotates -90. So Index 0 starts at 12 o'clock.

            // Winning Segment Index: i
            // Segment i occupies [i*36, (i+1)*36] degrees (relative to 12 o'clock).
            // Center of segment i is: i*36 + 18.
            // To bring this center to 12 o'clock (0 relative rotation), we need to rotate
            // the whole wheel backwards by (i*36 + 18).
            // Or rotate forward by 360 - (i*36 + 18).

            const segmentAngle = 360 / REWARDS.length; // 36
            const winningSegmentCenter = (index * segmentAngle) + (segmentAngle / 2);

            // Add some full rotations (e.g., 5 to 8 full spins)
            const randomFullSpins = (5 + Math.floor(Math.random() * 3)) * 360;

            // Calculate final rotation value
            // Note: We are rotating the SVG container.
            // If we rotate it 360, it's back to same spot.
            // We want to stop such that winning segment is at Top.
            // We need to rotate CLOCKWISE such that the target moves from its position to Top.
            // Target is at +winningSegmentCenter (CW from Top).
            // To get to Top, it needs to move 360 - winningSegmentCenter degrees.

            const finalRotationOffset = 360 - winningSegmentCenter;
            const totalRotation = randomFullSpins + finalRotationOffset;

            Animated.timing(spinValue, {
                toValue: totalRotation,
                duration: 5000, // 5 seconds spin
                easing: Easing.bezier(0.25, 0.1, 0.25, 1), // Cubic Bezier for realistic slow down
                useNativeDriver: true,
            }).start(() => {
                setIsSpinning(false);
                setResultModalVisible(true);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                spinValue.setValue(totalRotation % 360); // Reset to keep position but avoid huge numbers next time
            });

        } catch (err) {
            console.error("Spin Error", err);
            Alert.alert("Error", "Could not spin. Try again.");
            setIsSpinning(false);
        }
    };

    const rotateInterpolate = spinValue.interpolate({
        inputRange: [0, 360],
        outputRange: ['0deg', '360deg'],
    });

    return (
        <AppBackground>
            <View style={styles.container}>

                {/* Header */}
                <View style={{ alignItems: 'center', marginTop: 40 }}>
                    <Text style={styles.title}>LUCKY SPIN</Text>
                    <Text style={styles.subtitle}>Win up to 10,000 Coins!</Text>
                </View>

                {/* Wheel Container */}
                <View style={styles.wheelContainer}>

                    {/* The Wheel */}
                    <View style={styles.wheelShadow}>
                        <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
                            <Svg width={WHEEL_SIZE} height={WHEEL_SIZE}>
                                <Defs>
                                    <SvgLinearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                                        <Stop offset="0" stopColor="#FFD700" stopOpacity="1" />
                                        <Stop offset="1" stopColor="#FDB931" stopOpacity="1" />
                                    </SvgLinearGradient>
                                </Defs>

                                <G transform={`rotate(0, ${CENTER}, ${CENTER})`}>
                                    {/* Outer Rim */}
                                    <Circle cx={CENTER} cy={CENTER} r={RADIUS + 15} fill="#4b0082" stroke="#FFD700" strokeWidth="5" />

                                    {REWARDS.map((reward, i) => {
                                        return (
                                            <G key={i}>
                                                <Path
                                                    d={makeWheelPath(i)}
                                                    fill={reward.color}
                                                    stroke="#1A1A2E" // Dark border between segments
                                                    strokeWidth="2"
                                                />
                                                {/* Text Label */}
                                                <G
                                                    rotation={(i * ANGLE_PER_SEGMENT) + (ANGLE_PER_SEGMENT / 2)}
                                                    origin={`${CENTER}, ${CENTER}`}
                                                >
                                                    <SvgText
                                                        x={CENTER}
                                                        y={CENTER - RADIUS + 50}
                                                        fill={reward.color === '#ECF0F1' ? '#000' : '#FFF'} // Dark text for light bg
                                                        fontSize="16"
                                                        fontWeight="900"
                                                        textAnchor="middle"
                                                        alignmentBaseline="central"
                                                    >
                                                        {reward.label}
                                                    </SvgText>
                                                </G>
                                            </G>
                                        );
                                    })}

                                    {/* Center Hub */}
                                    <Circle cx={CENTER} cy={CENTER} r={35} fill="#1A1A2E" stroke="#FFD700" strokeWidth="4" />
                                </G>
                            </Svg>
                        </Animated.View>
                    </View>

                    {/* Pointer (Overlay at top center) */}
                    <View style={styles.pointerContainer}>
                        {/* Simple Triangle Pointer */}
                        <View style={styles.pointerBody} />
                        <View style={styles.pointerTip} />
                    </View>
                </View>

                {/* 3D Spin Button */}
                <TouchableOpacity
                    style={[styles.spinButton, isSpinning && styles.spinButtonDisabled]}
                    onPress={spin}
                    disabled={isSpinning}
                    activeOpacity={0.8}
                >
                    <LinearGradient
                        colors={['#FF512F', '#DD2476']}
                        style={styles.spinBtnGradient}
                    >
                        <Text style={styles.spinText}>{isSpinning ? "SPINNING..." : "SPIN"}</Text>
                    </LinearGradient>
                    <View style={styles.spinBtnShadow} />
                </TouchableOpacity>

                {/* Result Modal */}
                <Modal
                    transparent={true}
                    visible={resultModalVisible}
                    animationType="slide"
                    onRequestClose={() => setResultModalVisible(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={[styles.modalHeader, { backgroundColor: wonAmount > 0 ? COLORS.success : COLORS.textDim }]}>
                                <Text style={styles.wonTitle}>{wonAmount > 0 ? "🎉 CONGRATS! 🎉" : "Oops!"}</Text>
                            </View>

                            <View style={{ padding: 30, alignItems: 'center' }}>
                                <Text style={styles.wonDesc}>You won</Text>
                                <Text style={styles.wonAmount}>
                                    {wonAmount > 0 ? `💰 ${wonAmount}` : "0 Coins"}
                                </Text>
                                {wonAmount === 10000 && <Text style={{ color: '#FFD700', fontWeight: 'bold', marginTop: 10 }}>JACKPOT!</Text>}
                            </View>

                            <TouchableOpacity
                                style={[styles.claimBtn, { backgroundColor: wonAmount > 0 ? COLORS.success : COLORS.textDim }]}
                                onPress={() => setResultModalVisible(false)}
                            >
                                <Text style={styles.claimText}>Collect Prize</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>

            </View>
        </AppBackground>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, alignItems: 'center', justifyContent: 'space-between', paddingBottom: 110 }, // Increased padding to clear TabBar
    title: { color: '#FFD700', fontSize: 36, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2, textShadowColor: 'black', textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 10 },
    subtitle: { color: '#EEE', fontSize: 16, marginTop: 5, fontWeight: '600' },

    wheelContainer: { position: 'relative', alignItems: 'center', justifyContent: 'center', marginVertical: 20 },
    wheelShadow: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 15,
        elevation: 20, // For Android
    },

    // Custom Pointer Styles
    pointerContainer: { position: 'absolute', top: -30, alignItems: 'center', zIndex: 100 },
    pointerBody: { width: 20, height: 20, backgroundColor: '#FFD700', borderTopLeftRadius: 5, borderTopRightRadius: 5, borderWidth: 2, borderColor: '#FFF' },
    pointerTip: { width: 0, height: 0, backgroundColor: 'transparent', borderStyle: 'solid', borderLeftWidth: 15, borderRightWidth: 15, borderTopWidth: 25, borderTopColor: '#FFD700', transform: [{ translateY: -5 }] },

    // 3D Button Styles
    spinButton: {
        width: 220, height: 75,
        marginBottom: 30,
    },
    spinBtnGradient: {
        flex: 1, borderRadius: 40, alignItems: 'center', justifyContent: 'center', zIndex: 2, borderWidth: 2, borderColor: '#FFF'
    },
    spinBtnShadow: {
        position: 'absolute', top: 6, width: '100%', height: '100%', backgroundColor: '#900', borderRadius: 40, zIndex: 1
    },
    spinButtonDisabled: { opacity: 0.8, transform: [{ translateY: 4 }] }, // Press down effect
    spinText: { color: '#FFF', fontSize: 28, fontWeight: '900', letterSpacing: 1.5, textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center' },
    modalContent: { width: '85%', backgroundColor: '#FFF', borderRadius: 25, overflow: 'hidden', alignItems: 'center', elevation: 10 },
    modalHeader: { width: '100%', padding: 20, alignItems: 'center', justifyContent: 'center' },
    wonTitle: { color: '#FFF', fontSize: 28, fontWeight: 'bold' },
    wonDesc: { color: '#555', fontSize: 18, marginBottom: 5 },
    wonAmount: { color: '#000', fontSize: 50, fontWeight: 'bold' },
    claimBtn: { paddingHorizontal: 50, paddingVertical: 15, borderRadius: 30, marginBottom: 30 },
    claimText: { color: '#FFF', fontSize: 20, fontWeight: 'bold' }
});
