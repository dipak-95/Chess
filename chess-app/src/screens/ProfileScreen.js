import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, Image } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { COLORS, SHADOWS } from '../constants/theme';
import AppBackground from '../components/AppBackground';
import UserAvatar from '../components/UserAvatar';
import api from '../services/authService';
import { LinearGradient } from 'expo-linear-gradient';
import { Trophy, TrendingUp, History, Lock, Unlock, Settings } from 'lucide-react-native';

import { AVATAR_DATA } from '../constants/avatars';

export default function ProfileScreen() {
    const navigation = useNavigation();
    const [profile, setProfile] = useState(null);

    useFocusEffect(
        useCallback(() => {
            fetchProfile();
        }, [])
    );

    const fetchProfile = async () => {
        try {
            const res = await api.get('/users/profile');
            setProfile(res.data);
        } catch (err) {
            console.log("Error fetching profile", err);
        }
    };

    if (!profile) return null;

    // Calculations
    const totalGames = profile.stats?.totalGames || 0;
    const wins = profile.stats?.wins || 0;
    const losses = profile.stats?.losses || 0;
    const draws = profile.stats?.draws || 0;
    const winRate = totalGames > 0 ? ((wins / totalGames) * 100).toFixed(1) : 0;

    // Level Progress
    const level = profile.level || 1;
    const currentXp = profile.xp || 0;
    const nextLevelXp = level * 500;
    const progress = Math.min(currentXp / nextLevelXp, 1);

    const renderHistoryItem = ({ item }) => (
        <View style={styles.historyItem}>
            <View style={styles.historyLeft}>
                <View style={[styles.resultBadge,
                item.result === 'Win' ? styles.winBadge :
                    item.result === 'Loss' ? styles.lossBadge : styles.drawBadge
                ]}>
                    <Text style={styles.resultText}>{item.result === 'Win' ? 'W' : item.result === 'Loss' ? 'L' : 'D'}</Text>
                </View>
                <View style={{ marginLeft: 10 }}>
                    <Text style={styles.historyOpponent}>vs {item.opponentName || 'Unknown'}</Text>
                    <Text style={styles.historyDate}>{new Date(item.date).toLocaleDateString()}</Text>
                </View>
            </View>
            <Text style={[styles.historyAmount, { color: item.result === 'Win' ? COLORS.success : COLORS.error }]}>
                {item.result === 'Win' ? '+' : '-'}{item.amount}
            </Text>
        </View>
    );

    // Filter only unlocked avatars for this view
    const myAvatars = AVATAR_DATA.filter(av => profile.unlockedAvatars?.includes(av.id));

    return (
        <AppBackground>
            <View style={styles.container}>
                <ScrollView showsVerticalScrollIndicator={false}>

                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                            <Text style={styles.backText}>← Back</Text>
                        </TouchableOpacity>
                        <Text style={styles.screenTitle}>My Profile</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
                            <Settings color={COLORS.text} size={24} />
                        </TouchableOpacity>
                    </View>

                    {/* Main Profile Card */}
                    <LinearGradient
                        colors={[COLORS.bgDark2, 'rgba(0,0,0,0.6)']}
                        style={styles.profileCard}
                    >
                        <UserAvatar avatarId={profile.avatarId} size={100} />
                        <Text style={styles.userName}>{profile.gamingName}</Text>

                        {/* Level Bar */}
                        <View style={styles.levelContainer}>
                            <View style={styles.levelHeader}>
                                <Text style={styles.levelText}>Lvl {level}</Text>
                                <Text style={styles.xpText}>{currentXp}/{nextLevelXp} XP</Text>
                            </View>
                            <View style={styles.progressBarBg}>
                                <LinearGradient
                                    colors={[COLORS.primary, COLORS.secondary]}
                                    style={[styles.progressBarFill, { width: `${progress * 100}%` }]}
                                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                />
                            </View>
                        </View>

                        <View style={styles.balanceContainer}>
                            <Text style={styles.balanceLabel}>Total Winnings</Text>
                            <Text style={styles.balanceValue}>💰 {profile.coins}</Text>
                        </View>
                    </LinearGradient>

                    {/* Stats Grid */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}><TrendingUp size={20} color={COLORS.accent} />  Performance</Text>
                        <View style={styles.statsGrid}>
                            <View style={styles.statBox}>
                                <Text style={styles.statValue}>{winRate}%</Text>
                                <Text style={styles.statLabel}>Win Rate</Text>
                            </View>
                            <View style={styles.statBox}>
                                <Text style={[styles.statValue, { color: COLORS.success }]}>{wins}</Text>
                                <Text style={styles.statLabel}>Wins</Text>
                            </View>
                            <View style={styles.statBox}>
                                <Text style={[styles.statValue, { color: COLORS.error }]}>{losses}</Text>
                                <Text style={styles.statLabel}>Losses</Text>
                            </View>
                            <View style={styles.statBox}>
                                <Text style={[styles.statValue, { color: COLORS.textDim }]}>{draws}</Text>
                                <Text style={styles.statLabel}>Draws</Text>
                            </View>
                        </View>
                    </View>

                    {/* Avatar Collection */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}><Trophy size={20} color="#FFD700" />  My Avatars</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.avatarScroll}>
                            {myAvatars.map((av) => {
                                const isSelected = profile.avatarId === av.id;

                                return (
                                    <TouchableOpacity
                                        key={av.id}
                                        style={[styles.avatarItem, isSelected && styles.avatarSelected]}
                                        onPress={async () => {
                                            await api.put('/users/avatar', { avatarId: av.id });
                                            fetchProfile();
                                        }}
                                    >
                                        <UserAvatar avatarId={av.id} size={60} />
                                        {isSelected && <View style={styles.selectedDot} />}
                                    </TouchableOpacity>
                                );
                            })}

                            {/* Buy New Button */}
                            <TouchableOpacity
                                style={styles.buyNewBtn}
                                onPress={() => navigation.navigate('AvatarShop')}
                            >
                                <View style={styles.plusIcon}>
                                    <Text style={{ color: '#FFF', fontSize: 24 }}>+</Text>
                                </View>
                                <Text style={styles.buyNewText}>Shop</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>

                    {/* Match History */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}><History size={20} color={COLORS.text} />  Match History</Text>
                        {(!profile.matchHistory || profile.matchHistory.length === 0) ? (
                            <Text style={styles.emptyText}>No matches played yet.</Text>
                        ) : (
                            // Showing last 10 in reverse order (newest first)
                            [...profile.matchHistory].reverse().map((item, index) => (
                                <View key={index}>
                                    {renderHistoryItem({ item })}
                                </View>
                            ))
                        )}
                        <View style={{ height: 50 }} />
                    </View>

                </ScrollView>
            </View>
        </AppBackground>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, paddingTop: 50, paddingHorizontal: 20 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    backText: { color: COLORS.textDim, fontSize: 16 },
    screenTitle: { color: COLORS.text, fontSize: 22, fontWeight: 'bold' },

    profileCard: { padding: 30, borderRadius: 25, alignItems: 'center', borderWidth: 1, borderColor: COLORS.glassBorder, marginBottom: 30 },
    userName: { color: COLORS.text, fontSize: 24, fontWeight: 'bold', marginTop: 15, marginBottom: 10 },

    levelContainer: { width: '100%', marginTop: 10, marginBottom: 20 },
    levelHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    levelText: { color: COLORS.primary, fontWeight: 'bold' },
    xpText: { color: COLORS.textDim, fontSize: 12 },
    progressBarBg: { height: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' },
    progressBarFill: { height: '100%' },

    balanceContainer: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', backgroundColor: 'rgba(0,0,0,0.3)', padding: 15, borderRadius: 15, alignItems: 'center' },
    balanceLabel: { color: COLORS.textDim },
    balanceValue: { color: '#FFD700', fontSize: 18, fontWeight: 'bold' },

    section: { marginBottom: 30 },
    sectionTitle: { color: COLORS.text, fontSize: 18, fontWeight: 'bold', marginBottom: 15 },

    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    statBox: { width: '48%', backgroundColor: COLORS.glass, padding: 15, borderRadius: 15, marginBottom: 15, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    statValue: { fontSize: 24, fontWeight: 'bold', color: COLORS.text, marginBottom: 5 },
    statLabel: { color: COLORS.textDim, fontSize: 12 },

    avatarScroll: { flexDirection: 'row' },
    avatarItem: { marginRight: 15, position: 'relative', padding: 3, borderRadius: 35 },
    avatarSelected: { borderWidth: 2, borderColor: COLORS.success },
    selectedDot: { position: 'absolute', bottom: 0, right: 0, width: 20, height: 20, backgroundColor: COLORS.success, borderRadius: 10, borderWidth: 2, borderColor: COLORS.bgDark },
    lockOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 30, justifyContent: 'center', alignItems: 'center' },

    buyNewBtn: { alignItems: 'center', justifyContent: 'center', marginRight: 15 },
    plusIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.bgDark2, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: COLORS.textDim, borderStyle: 'dashed' },
    buyNewText: { color: COLORS.textDim, marginTop: 5, fontSize: 12 },

    historyItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.glass, padding: 15, borderRadius: 15, marginBottom: 10 },
    historyLeft: { flexDirection: 'row', alignItems: 'center' },
    resultBadge: { width: 30, height: 30, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    winBadge: { backgroundColor: 'rgba(76, 209, 55, 0.2)' },
    lossBadge: { backgroundColor: 'rgba(232, 65, 24, 0.2)' },
    drawBadge: { backgroundColor: 'rgba(220, 221, 225, 0.2)' },
    resultText: { fontWeight: 'bold', color: '#FFF' },
    historyOpponent: { color: COLORS.text, fontWeight: 'bold', fontSize: 15 },
    historyDate: { color: COLORS.textDim, fontSize: 12, marginTop: 2 },
    historyAmount: { fontWeight: 'bold', fontSize: 16 },

    emptyText: { color: COLORS.textDim, fontStyle: 'italic', textAlign: 'center', marginTop: 10 }
});
