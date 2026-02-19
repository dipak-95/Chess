import React from 'react';
import { ImageBackground, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../constants/theme';

// High definition dark chess aesthetic background
const CHESS_BG_IMAGE = { uri: 'https://images.unsplash.com/photo-1586165368502-1bad197a6461?q=80&w=2658&auto=format&fit=crop' };

export default function AppBackground({ children }) {
    return (
        <ImageBackground
            source={CHESS_BG_IMAGE}
            style={styles.background}
            resizeMode="cover"
        >
            {/* Dark overlay to make text readable */}
            <LinearGradient
                colors={[COLORS.bgDark + 'E6', COLORS.bgDark2 + 'E6']} // Hex + Alpha (E6 = ~90% opacity)
                style={styles.overlay}
            >
                {children}
            </LinearGradient>
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    background: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    overlay: {
        flex: 1,
        width: '100%',
        height: '100%',
    }
});
