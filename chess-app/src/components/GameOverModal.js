import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, Dimensions, Animated, Easing } from 'react-native';
import { COLORS, SHADOWS } from '../constants/theme';
import { Coins, Trophy, Frown, Sparkles } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

export default function GameOverModal({ visible, isWinner, betAmount, winnerName, reason }) {
    // Animation Values
    const leftCoins = useRef(new Animated.Value(0)).current;
    const rightCoins = useRef(new Animated.Value(0)).current;
    const winnerScale = useRef(new Animated.Value(0)).current;
    const boxOpacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            // Reset
            leftCoins.setValue(0);
            rightCoins.setValue(0);
            winnerScale.setValue(0);
            boxOpacity.setValue(0);

            // Sequence
            Animated.sequence([
                // 1. Show Box
                Animated.timing(boxOpacity, {
                    toValue: 1, duration: 500, useNativeDriver: true
                }),
                // 2. Animate Coins to Winner (Assuming Middle)
                Animated.parallel([
                    Animated.timing(leftCoins, {
                        toValue: 1, duration: 1000, easing: Easing.bounce, useNativeDriver: true
                    }),
                    Animated.timing(rightCoins, {
                        toValue: 1, duration: 1000, easing: Easing.bounce, useNativeDriver: true
                    })
                ]),
                // 3. Show Winner Title
                Animated.spring(winnerScale, {
                    toValue: 1, friction: 3, useNativeDriver: true
                })
            ]).start();
        }
    }, [visible]);

    // Interpolations for coin movement
    // Left side coins move to center
    const leftTranslate = leftCoins.interpolate({
        inputRange: [0, 1],
        outputRange: [0, width * 0.25] // Move right
    });
    // Right side coins move to center
    const rightTranslate = rightCoins.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -width * 0.25] // Move left
    });

    if (!visible) return null;

    return (
        <Modal transparent visible={visible} animationType="none">
            <View style={styles.overlay}>
                {/* Result Box */}
                <Animated.View style={[styles.box, { opacity: boxOpacity }]}>
                    <Text style={styles.reason}>{reason || 'Game Over'}</Text>

                    <View style={styles.playersRow}>
                        {/* Left Player (Assuming You) */}
                        <View style={styles.side}>
                            <Text style={styles.playerLabel}>You</Text>
                            <Text style={[styles.resultText, { color: isWinner ? COLORS.success : COLORS.error }]}>
                                {isWinner ? 'WINNER' : 'LOSER'}
                            </Text>
                            {/* Coins */}
                            <Animated.View style={{ transform: [{ translateX: isWinner ? 0 : leftTranslate }, { scale: isWinner ? 1.2 : 0 }] }}>
                                <Coins size={32} color="#FFD700" />
                                <Text style={styles.coinText}>{betAmount}</Text>
                            </Animated.View>
                        </View>

                        <View style={styles.divider} />

                        {/* Right Player (Opponent) */}
                        <View style={styles.side}>
                            <Text style={styles.playerLabel}>Opponent</Text>
                            <Text style={[styles.resultText, { color: !isWinner ? COLORS.success : COLORS.error }]}>
                                {!isWinner ? 'WINNER' : 'LOSER'}
                            </Text>
                            {/* Coins */}
                            <Animated.View style={{ transform: [{ translateX: !isWinner ? 0 : rightTranslate }, { scale: !isWinner ? 1.2 : 0 }] }}>
                                <Coins size={32} color="#FFD700" />
                                <Text style={styles.coinText}>{betAmount}</Text>
                            </Animated.View>
                        </View>
                    </View>

                    {/* Celebration Center */}
                    <Animated.View style={[styles.centerPiece, { transform: [{ scale: winnerScale }] }]}>
                        {isWinner ? (
                            <>
                                <Trophy size={64} color="#FFD700" style={SHADOWS.medium} />
                                <Text style={styles.winnerText}>YOU WIN!</Text>
                                <Text style={styles.winningsText}>+{betAmount * 2}</Text>
                            </>
                        ) : (
                            <>
                                <Frown size={64} color={COLORS.textDim} />
                                <Text style={[styles.winnerText, { color: COLORS.textDim }]}>YOU LOST</Text>
                                <Text style={[styles.winningsText, { color: COLORS.error }]}>-{betAmount}</Text>
                            </>
                        )}
                    </Animated.View>

                    <Text style={styles.redirectText}>Redirecting to home...</Text>

                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.9)',
        justifyContent: 'center', alignItems: 'center'
    },
    box: {
        width: width * 0.9,
        backgroundColor: COLORS.bgDark2,
        borderRadius: 20,
        padding: 20,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: COLORS.accent,
        height: 400
    },
    reason: {
        color: COLORS.textDim, fontSize: 16, marginBottom: 20, textTransform: 'uppercase', letterSpacing: 2
    },
    playersRow: {
        flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 40
    },
    side: {
        alignItems: 'center', flex: 1
    },
    playerLabel: {
        color: COLORS.text, fontSize: 14, marginBottom: 5
    },
    resultText: {
        fontSize: 20, fontWeight: 'bold', marginBottom: 10
    },
    coinText: {
        color: '#FFD700', fontWeight: 'bold'
    },
    divider: {
        width: 1, backgroundColor: 'rgba(255,255,255,0.1)', height: '100%'
    },
    centerPiece: {
        position: 'absolute', top: 120, alignItems: 'center', zIndex: 10,
        backgroundColor: 'rgba(0,0,0,0.8)', padding: 20, borderRadius: 20
    },
    winnerText: {
        color: COLORS.success, fontSize: 32, fontWeight: 'bold', marginVertical: 10, textShadowColor: COLORS.success, textShadowRadius: 10
    },
    winningsText: {
        color: '#FFD700', fontSize: 24, fontWeight: 'bold'
    },
    redirectText: {
        position: 'absolute', bottom: 20, color: COLORS.textDim
    }
});
