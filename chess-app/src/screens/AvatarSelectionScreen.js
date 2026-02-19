import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES, SHADOWS } from '../constants/theme';
import { Lock } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import api from '../services/authService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import UserAvatar from '../components/UserAvatar';
import AppBackground from '../components/AppBackground';
import { AVATAR_DATA } from '../constants/avatars';

// Get just the 3 Basic Free Avatars
const BASIC_AVATARS = AVATAR_DATA.filter(a => a.category === 'Basic').map((a, index) => ({
    ...a,
    name: ['Ranger', 'Warrior', 'Mage'][index] || 'Hero',
    locked: false
}));

export default function AvatarSelectionScreen() {
    const navigation = useNavigation();
    const [selected, setSelected] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleConfirm = async () => {
        if (!selected) {
            Alert.alert("Select Avatar", "Please choose your avatar to continue.");
            return;
        }

        setLoading(true);
        try {
            await api.put('/users/avatar', { avatarId: selected.id });

            // Update local storage user
            const userStr = await AsyncStorage.getItem('user');
            if (userStr) {
                const user = JSON.parse(userStr);
                user.avatarId = selected.id;
                await AsyncStorage.setItem('user', JSON.stringify(user));
            }

            navigation.replace('Main');
        } catch (error) {
            console.log("Avatar Save Error", error);
            Alert.alert("Error", "Could not save avatar. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AppBackground>
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>Choose Your Identity</Text>
                    <Text style={styles.subtitle}>Start your journey with a free avatar.</Text>
                </View>

                {/* Main Selection Area */}
                <View style={styles.selectionArea}>
                    <ScrollView contentContainerStyle={styles.grid}>
                        {BASIC_AVATARS.map((avatar) => {
                            const isSelected = selected?.id === avatar.id;

                            return (
                                <TouchableOpacity
                                    key={avatar.id}
                                    style={[
                                        styles.avatarCard,
                                        isSelected && styles.selectedCard
                                    ]}
                                    onPress={() => setSelected(avatar)}
                                    activeOpacity={0.8}
                                >
                                    <View style={styles.avatarContainer}>
                                        <UserAvatar avatarId={avatar.id} size={90} />
                                    </View>

                                    <Text style={[styles.nameText, isSelected && { color: COLORS.accent }]}>
                                        {avatar.name}
                                    </Text>

                                    <View style={styles.badge}>
                                        <Text style={styles.badgeText}>FREE</Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>

                <View style={styles.footer}>
                    <TouchableOpacity
                        onPress={handleConfirm}
                        style={[styles.button, (!selected || loading) && { opacity: 0.7 }]}
                        disabled={!selected || loading}
                    >
                        <LinearGradient
                            colors={selected ? [COLORS.primary, COLORS.secondary] : ['#555', '#333']}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                            style={styles.gradientButton}
                        >
                            <Text style={styles.buttonText}>{loading ? "SAVING..." : "START PLAYING"}</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </View>
        </AppBackground>
    );
}

const { width } = Dimensions.get('window');
const cardWidth = (width - 60) / 2; // 2 columns

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { marginTop: 80, alignItems: 'center', marginBottom: 40, paddingHorizontal: 20 },
    title: { fontSize: 32, fontWeight: 'bold', color: COLORS.text, marginBottom: 10, textAlign: 'center' },
    subtitle: { color: COLORS.textDim, fontSize: 16, textAlign: 'center' },

    selectionArea: { flex: 1, paddingHorizontal: 20 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },

    avatarCard: {
        width: 140, // Fixed width
        height: 180, // Fixed height
        margin: 10,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 20,
        alignItems: 'center',
        paddingVertical: 20,
        borderWidth: 2,
        borderColor: 'transparent',
        ...SHADOWS.medium
    },
    selectedCard: {
        borderColor: COLORS.accent,
        backgroundColor: 'rgba(0, 210, 211, 0.1)',
        transform: [{ scale: 1.05 }]
    },

    avatarContainer: { marginBottom: 15 },

    nameText: { color: COLORS.text, fontSize: 16, fontWeight: 'bold', marginBottom: 10 },

    badge: {
        backgroundColor: 'rgba(76, 209, 55, 0.2)',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 10,
        marginTop: 'auto'
    },
    badgeText: { color: COLORS.success, fontSize: 12, fontWeight: 'bold' },

    footer: { padding: 30, paddingBottom: 50 },
    button: { borderRadius: 15, overflow: 'hidden', ...SHADOWS.medium },
    gradientButton: { paddingVertical: 18, alignItems: 'center' },
    buttonText: { color: COLORS.text, fontWeight: 'bold', fontSize: 16, letterSpacing: 1 }
});
