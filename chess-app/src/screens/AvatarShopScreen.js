import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { COLORS, SHADOWS } from '../constants/theme';
import AppBackground from '../components/AppBackground';
import UserAvatar from '../components/UserAvatar';
import api from '../services/authService';
import { AVATAR_DATA } from '../constants/avatars';
import { Lock, Coins, Check, ArrowLeft } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function AvatarShopScreen() {
    const navigation = useNavigation();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const [buyingId, setBuyingId] = useState(null);

    useFocusEffect(
        useCallback(() => {
            fetchUser();
        }, [])
    );

    const fetchUser = async () => {
        try {
            const res = await api.get('/users/profile');
            setUser(res.data);
        } catch (err) {
            console.log(err);
        }
    };

    const handleBuy = async (item) => {
        if (!user) return;
        if (user.coins < item.price) {
            Alert.alert("Insufficient Funds", "You need more coins to buy this avatar.");
            return;
        }

        setBuyingId(item.id);
        try {
            const res = await api.post('/users/buy-avatar', {
                avatarId: item.id,
                cost: item.price
            });
            setUser(res.data); // Update user state with new unlock
            Alert.alert("Success!", "Avatar unlocked.");
        } catch (err) {
            Alert.alert("Error", err.response?.data?.msg || "Purchase failed");
        } finally {
            setBuyingId(null);
        }
    };

    if (!user) return null;

    const renderAvatarItem = (item) => {
        const isUnlocked = user.unlockedAvatars.includes(item.id);
        const isSelected = user.avatarId === item.id;

        return (
            <View key={item.id} style={styles.cardWrapper}>
                <TouchableOpacity
                    style={[styles.card, isSelected && styles.cardSelected]}
                    onPress={() => {
                        if (isUnlocked) {
                            // Equip
                            api.put('/users/avatar', { avatarId: item.id }).then(res => {
                                setUser(res.data);
                            });
                        } else {
                            handleBuy(item);
                        }
                    }}
                    disabled={buyingId !== null}
                >
                    <UserAvatar avatarId={item.id} size={70} />

                    {isSelected && (
                        <View style={styles.equippedBadge}>
                            <Check size={12} color="#FFF" />
                            <Text style={styles.equipText}>Equipped</Text>
                        </View>
                    )}

                    <View style={styles.infoContainer}>
                        {isUnlocked ? (
                            <Text style={styles.ownedText}>Owned</Text>
                        ) : (
                            <View style={styles.priceTag}>
                                <Coins size={14} color="#FFD700" />
                                <Text style={styles.priceText}>{item.price}</Text>
                            </View>
                        )}
                    </View>

                    {/* Lock Overlay for locked items */}
                    {!isUnlocked && (
                        <View style={styles.actionOverlay}>
                            {buyingId === item.id ? (
                                <ActivityIndicator color={COLORS.primary} />
                            ) : (
                                <Text style={styles.buyText}>Buy</Text>
                            )}
                        </View>
                    )}
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <AppBackground>
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <ArrowLeft color="#FFF" size={24} />
                    </TouchableOpacity>
                    <Text style={styles.title}>Avatar Shop</Text>
                    <View style={styles.balancePill}>
                        <Coins size={16} color="#FFD700" />
                        <Text style={styles.balanceText}>{user.coins}</Text>
                    </View>
                </View>

                <ScrollView contentContainerStyle={styles.grid}>
                    <Text style={styles.sectionHeader}>Male Avatars</Text>
                    <View style={styles.row}>
                        {AVATAR_DATA.filter(a => a.category === 'Male').map(renderAvatarItem)}
                    </View>

                    <Text style={styles.sectionHeader}>Female Avatars</Text>
                    <View style={styles.row}>
                        {AVATAR_DATA.filter(a => a.category === 'Female').map(renderAvatarItem)}
                    </View>

                    <Text style={styles.sectionHeader}>Basics</Text>
                    <View style={styles.row}>
                        {AVATAR_DATA.filter(a => a.category === 'Basic').map(renderAvatarItem)}
                    </View>

                    <View style={{ height: 50 }} />
                </ScrollView>
            </View>
        </AppBackground>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, paddingTop: 50 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 20 },
    backBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12 },
    title: { fontSize: 24, fontWeight: 'bold', color: COLORS.text },
    balancePill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#FFD700' },
    balanceText: { color: '#FFD700', fontWeight: 'bold', marginLeft: 8, fontSize: 16 },

    grid: { paddingHorizontal: 15 },
    sectionHeader: { color: COLORS.textDim, fontSize: 18, fontWeight: 'bold', marginTop: 20, marginBottom: 15, marginLeft: 5 },
    row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' },

    cardWrapper: { width: '33.33%', padding: 6 },
    card: {
        backgroundColor: COLORS.glass,
        alignItems: 'center',
        padding: 15,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.glassBorder,
        position: 'relative'
    },
    cardSelected: { borderColor: COLORS.success, backgroundColor: 'rgba(76, 209, 55, 0.1)' },

    infoContainer: { marginTop: 10, alignItems: 'center' },
    priceTag: { flexDirection: 'row', alignItems: 'center' },
    priceText: { color: '#FFD700', fontWeight: 'bold', marginLeft: 4 },
    ownedText: { color: COLORS.success, fontWeight: 'bold', fontSize: 12 },

    equippedBadge: { position: 'absolute', top: 5, right: 5, backgroundColor: COLORS.success, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, flexDirection: 'row', alignItems: 'center' },
    equipText: { color: '#FFF', fontSize: 8, fontWeight: 'bold', marginLeft: 2 },

    actionOverlay: { marginTop: 5, backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10 },
    buyText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 }
});
