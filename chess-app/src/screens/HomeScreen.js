import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal, Alert, TextInput } from 'react-native';
import { COLORS, SIZES, SHADOWS } from '../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { Cpu, Smartphone, Users, Globe, Trophy } from 'lucide-react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/authService';
import UserAvatar from '../components/UserAvatar';
import AppBackground from '../components/AppBackground';

const GameModeCard = ({ title, subtitle, icon, color1, color2, onPress }) => (
    <TouchableOpacity onPress={onPress}>
        <LinearGradient
            colors={[color1, color2]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.card}
        >
            <View style={styles.cardIcon}>
                {icon}
            </View>
            <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{title}</Text>
                <Text style={styles.cardSubtitle}>{subtitle}</Text>
            </View>
        </LinearGradient>
    </TouchableOpacity>
);

export default function HomeScreen() {
    const navigation = useNavigation();
    const [user, setUser] = useState(null);

    useFocusEffect(
        useCallback(() => {
            loadUserProfile();
        }, [])
    );

    const loadUserProfile = async () => {
        try {
            // First try from local storage for instant load
            const localUser = await AsyncStorage.getItem('user');
            if (localUser) setUser(JSON.parse(localUser));

            // Then fetch fresh data from API
            const res = await api.get('/users/profile');
            setUser(res.data);

            // Update local storage
            await AsyncStorage.setItem('user', JSON.stringify(res.data));
        } catch (err) {
            console.log('Profile Load Error', err);
        }
    };

    const [modalVisible, setModalVisible] = useState(false);

    const [passModalVisible, setPassModalVisible] = useState(false);
    const [passNames, setPassNames] = useState({ white: '', black: '' });

    const startPassGame = () => {
        if (!passNames.white.trim() || !passNames.black.trim()) {
            Alert.alert("Error", "Please enter names for both players");
            return;
        }
        setPassModalVisible(false);

        // Random Avatar IDs
        const av1 = `avatar_0${Math.floor(Math.random() * 3) + 1}`; // 1-3 (Free ones)
        const av2 = `avatar_0${Math.floor(Math.random() * 3) + 1}`;

        navigation.navigate('Game', {
            mode: 'pass',
            players: {
                white: { name: passNames.white, avatarId: av1 },
                black: { name: passNames.black, avatarId: av2 }
            }
        });
    };

    const startGame = (difficulty) => {
        setModalVisible(false);
        navigation.navigate('Game', { mode: 'computer', difficulty });
    };

    return (
        <AppBackground>
            <View style={styles.container}>
                {/* Top Bar */}
                <View style={styles.topBar}>
                    <TouchableOpacity style={styles.userInfo} onPress={() => navigation.navigate('Profile')}>
                        {/* Avatar */}
                        <UserAvatar avatarId={user?.avatarId} size={50} />
                        <View style={{ marginLeft: 10 }}>
                            <Text style={styles.userName}>{user?.gamingName || 'Player'}</Text>
                            <Text style={styles.userLevel}>Level {user?.level || 1}</Text>
                        </View>
                    </TouchableOpacity>

                    {/* Coin Balance */}
                    <View style={styles.coinBalance}>
                        <Text style={styles.coinText}>💰 {user?.coins || 0}</Text>
                    </View>
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <Text style={styles.sectionTitle}>Play Chess</Text>

                    <GameModeCard
                        title="Play vs Computer"
                        subtitle="Practice with AI (Easy, Medium, Hard)"
                        icon={<Cpu size={32} color="#A29BFE" />}
                        color1="rgba(108, 99, 255, 0.2)" color2="rgba(63, 61, 86, 0.2)"
                        onPress={() => setModalVisible(true)}
                    />

                    <GameModeCard
                        title="Pass n Play"
                        subtitle="Offline 2 Player Mode"
                        icon={<Smartphone size={32} color="#FF7675" />}
                        color1="rgba(255, 101, 132, 0.2)" color2="rgba(192, 57, 43, 0.2)"
                        onPress={() => setPassModalVisible(true)}
                    />

                    <GameModeCard
                        title="Play Friends"
                        subtitle="Create or Join Room"
                        icon={<Users size={32} color="#00CEC9" />}
                        color1="rgba(0, 210, 211, 0.2)" color2="rgba(1, 163, 164, 0.2)"
                        onPress={() => navigation.navigate('PlayFriends')}
                    />

                    <GameModeCard
                        title="Multiplayer Random"
                        subtitle="Match with World (Coin Stakes)"
                        icon={<Globe size={32} color="#FAB1A0" />}
                        color1="rgba(255, 165, 2, 0.2)" color2="rgba(255, 107, 129, 0.2)"
                        onPress={() => navigation.navigate('TableSelection')}
                    />

                </ScrollView>

                {/* Difficulty Modal */}
                {modalVisible && (
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Select Difficulty</Text>

                            <TouchableOpacity onPress={() => startGame('easy')} style={[styles.diffBtn, { borderColor: COLORS.success }]}>
                                <Text style={[styles.diffText, { color: COLORS.success }]}>Easy</Text>
                            </TouchableOpacity>

                            <TouchableOpacity onPress={() => startGame('medium')} style={[styles.diffBtn, { borderColor: COLORS.primary }]}>
                                <Text style={[styles.diffText, { color: COLORS.primary }]}>Medium</Text>
                            </TouchableOpacity>

                            <TouchableOpacity onPress={() => startGame('hard')} style={[styles.diffBtn, { borderColor: COLORS.error }]}>
                                <Text style={[styles.diffText, { color: COLORS.error }]}>Hard</Text>
                            </TouchableOpacity>

                            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.cancelBtn}>
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* Pass n Play Setup Modal */}
                {passModalVisible && (
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Player Setup</Text>

                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>White Player Name</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter Name"
                                    placeholderTextColor={COLORS.textDim}
                                    value={passNames.white}
                                    onChangeText={(t) => setPassNames({ ...passNames, white: t })}
                                />
                            </View>

                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>Black Player Name</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter Name"
                                    placeholderTextColor={COLORS.textDim}
                                    value={passNames.black}
                                    onChangeText={(t) => setPassNames({ ...passNames, black: t })}
                                />
                            </View>

                            <TouchableOpacity onPress={startPassGame} style={[styles.diffBtn, { backgroundColor: COLORS.primary, marginTop: 10 }]}>
                                <Text style={[styles.diffText, { color: '#FFF' }]}>Start Match</Text>
                            </TouchableOpacity>

                            <TouchableOpacity onPress={() => setPassModalVisible(false)} style={styles.cancelBtn}>
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

            </View>
        </AppBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        // backgroundColor: COLORS.bgDark, // Removed to show background image
    },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 50,
        paddingHorizontal: 20,
        paddingBottom: 20,
        backgroundColor: 'rgba(21, 21, 34, 0.7)', // Semi-transparent dark
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
        ...SHADOWS.medium
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    userName: {
        color: COLORS.text,
        fontSize: 16,
        fontWeight: 'bold',
    },
    userLevel: {
        color: COLORS.textDim,
        fontSize: 12,
    },
    coinBalance: {
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: '#FFD700',
    },
    coinText: {
        color: '#FFD700',
        fontWeight: 'bold',
        fontSize: 14,
    },
    scrollContent: {
        padding: 20,
    },
    sectionTitle: {
        color: COLORS.text,
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: SIZES.radius,
        padding: 20,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
        ...SHADOWS.medium,
    },
    cardIcon: {
        marginRight: 20,
        width: 50, // width/height to make it consistent
        alignItems: 'center',
    },
    cardContent: {
        flex: 1,
    },
    cardTitle: {
        color: COLORS.text,
        fontSize: 18,
        fontWeight: 'bold',
    },
    cardSubtitle: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 13,
    },
    modalOverlay: {
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center', alignItems: 'center',
        zIndex: 1000
    },
    modalContent: {
        width: '80%',
        backgroundColor: COLORS.bgDark2,
        borderRadius: 20,
        padding: 25,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.glassBorder,
        ...SHADOWS.medium
    },
    modalTitle: {
        fontSize: 22, color: COLORS.text, fontWeight: 'bold', marginBottom: 20
    },
    diffBtn: {
        width: '100%',
        paddingVertical: 15,
        marginBottom: 15,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)'
    },
    diffText: {
        fontSize: 18, fontWeight: 'bold'
    },
    cancelBtn: {
        marginTop: 10,
        padding: 10
    },
    cancelText: {
        color: COLORS.textDim,
        fontSize: 16
    },
    inputContainer: { width: '100%', marginBottom: 15 },
    label: { color: COLORS.textDim, marginBottom: 5, marginLeft: 5 },
    input: {
        width: '100%',
        backgroundColor: 'rgba(0,0,0,0.3)',
        padding: 15,
        borderRadius: 12,
        color: COLORS.text,
        borderWidth: 1,
        borderColor: COLORS.glassBorder,
    }
});
