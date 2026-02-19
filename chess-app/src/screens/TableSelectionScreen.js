import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Dimensions, ImageBackground, Animated, Modal, ActivityIndicator } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Lock, Coins, Trophy, ChevronRight, ChevronLeft, Users, Star, X, Search } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, SHADOWS, SIZES } from '../constants/theme';
import AppBackground from '../components/AppBackground';
import socketService from '../services/socketService';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.85;
const SPACING = (width - CARD_WIDTH) / 2;

// Tables Data with City Image URLs
const TABLES = [
    {
        id: 't1', entry: 250, prize: 500, city: 'Mumbai', minLevel: 1,
        image: require('../../assets/cities/mumbai.jpg'),
        accent: '#FFD700', difficulty: 'Beginner'
    },
    {
        id: 't2', entry: 500, prize: 1000, city: 'Delhi', minLevel: 1,
        image: require('../../assets/cities/delhi.jpg'),
        accent: '#00d2ff', difficulty: 'Beginner'
    },
    {
        id: 't3', entry: 1000, prize: 2000, city: 'London', minLevel: 1,
        image: require('../../assets/cities/london.jpg'),
        accent: '#50C878', difficulty: 'Amateur'
    },
    {
        id: 't4', entry: 2500, prize: 5000, city: 'Paris', minLevel: 1,
        image: require('../../assets/cities/paris.jpg'),
        accent: '#E056FD', difficulty: 'Pro'
    },
    {
        id: 't5', entry: 5000, prize: 10000, city: 'Dubai', minLevel: 15,
        image: require('../../assets/cities/dubai.jpg'),
        accent: '#FFD700', difficulty: 'Expert'
    },
    {
        id: 't6', entry: 10000, prize: 20000, city: 'New York', minLevel: 20,
        image: require('../../assets/cities/newyork.jpg'),
        accent: '#00B4DB', difficulty: 'Master'
    },
    {
        id: 't7', entry: 50000, prize: 100000, city: 'Vegas', minLevel: 25,
        image: require('../../assets/cities/vegas.jpg'),
        accent: '#FF416C', difficulty: 'Grandmaster'
    },
    {
        id: 't8', entry: 100000, prize: 200000, city: 'Moscow', minLevel: 30,
        image: require('../../assets/cities/moscow.jpg'),
        accent: '#8E2DE2', difficulty: 'Legend'
    },
    {
        id: 't9', entry: 500000, prize: 1000000, city: 'Tokyo', minLevel: 50,
        image: require('../../assets/cities/tokyo.jpg'),
        accent: '#00F260', difficulty: 'God'
    },
];

const getRandomPlayers = () => Math.floor(Math.random() * 500) + 50;

export default function TableSelectionScreen() {
    const navigation = useNavigation();
    const [userBalance, setUserBalance] = useState(0);
    const [userLevel, setUserLevel] = useState(1);
    const [userData, setUserData] = useState(null);

    const scrollX = useRef(new Animated.Value(0)).current;
    const flatListRef = useRef(null);
    const [activeIndex, setActiveIndex] = useState(0);

    // Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedTable, setSelectedTable] = useState(null);
    const [isSearching, setIsSearching] = useState(false);
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (isSearching) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.2, duration: 800, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true })
                ])
            ).start();
        } else {
            pulseAnim.setValue(1);
        }
    }, [isSearching]);

    useFocusEffect(
        useCallback(() => {
            loadUserData();
        }, [])
    );

    // Socket Listeners for Matchmaking
    useEffect(() => {
        const handleGameStart = ({ white, black, roomId, betAmount }) => {
            console.log('Match Found:', roomId);
            if (!userData) return;

            // Determine opponent
            const opponent = (userData._id === white._id) ? black : white;

            setIsSearching(false);
            setModalVisible(false); // Close selection modal if open

            navigation.navigate('Game', {
                mode: 'multiplayer',
                type: 'random',
                roomCode: roomId,
                betAmount: betAmount,
                opponent: opponent, // Passing opponent skips "Waiting for Opponent" screen in GameScreen
                isHost: (userData._id === white._id),
                myColor: (userData._id === white._id ? 'w' : 'b')
            });
        };

        const handleWaiting = () => {
            console.log('Added to queue, waiting...');
            setIsSearching(true);
        };

        socketService.on('game_start', handleGameStart);
        socketService.on('waiting_for_opponent', handleWaiting);

        return () => {
            socketService.off('game_start');
            socketService.off('waiting_for_opponent');
        };
    }, [navigation, userData]);

    const loadUserData = async () => {
        const userStr = await AsyncStorage.getItem('user');
        if (userStr) {
            const u = JSON.parse(userStr);
            setUserData(u);
            setUserBalance(u.coins || 0);
            setUserLevel(u.level || 1);
        }
    };

    const handleSelectTable = (table) => {
        setSelectedTable(table);
        setModalVisible(true);
    };

    const handleConfirmPlay = () => {
        if (!selectedTable || !userData) return;

        // Double check constraints
        if (userLevel < selectedTable.minLevel || userBalance < selectedTable.entry) {
            setModalVisible(false);
            return;
        }

        setModalVisible(false);
        setIsSearching(true); // Show searching UI immediately

        // Emit socket event
        socketService.findMatch(selectedTable.id, userData, selectedTable.entry);
    };

    const handleCancelSearch = () => {
        if (selectedTable) {
            socketService.cancelSearch(selectedTable.id);
        }
        setIsSearching(false);
        setSelectedTable(null); // Clear selection
    };

    const renderCustomModal = () => {
        if (!selectedTable) return null;

        const isLevelLocked = userLevel < selectedTable.minLevel;
        const isBalanceLocked = !isLevelLocked && userBalance < selectedTable.entry;
        const isLocked = isLevelLocked || isBalanceLocked;

        return (
            <Modal
                animationType="fade"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, isLocked ? styles.modalLockedBorder : styles.modalUnlockedBorder]}>
                        <LinearGradient
                            colors={['#1a1a1a', '#2d2d2d']}
                            style={styles.modalGradient}
                        >
                            {/* Modal Header */}
                            <View style={styles.modalHeader}>
                                {isLocked ? <Lock size={40} color="#FF6b6b" /> : <Trophy size={40} color="#FFD700" />}
                                <Text style={[styles.modalTitle, { color: isLocked ? '#FF6b6b' : '#FFD700' }]}>
                                    {isLocked ? "ARENA LOCKED" : "JOIN ARENA"}
                                </Text>
                            </View>

                            {/* Modal Body */}
                            <View style={styles.modalBody}>
                                {isLocked ? (
                                    <View style={styles.lockedMessageContainer}>
                                        <Text style={styles.lockedMessageText}>
                                            {isLevelLocked
                                                ? `You need Level ${selectedTable.minLevel} to enter ${selectedTable.city}!`
                                                : `Insufficient balance for ${selectedTable.city}. Earn more coins!`
                                            }
                                        </Text>
                                    </View>
                                ) : (
                                    <View style={styles.confirmDetails}>
                                        <Text style={styles.confirmText}>Enter {selectedTable.city}?</Text>
                                        <View style={styles.confirmRow}>
                                            <Text style={styles.confirmLabel}>ENTRY FEE:</Text>
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <Text style={styles.confirmValue}>{selectedTable.entry}</Text>
                                                <Coins size={16} color="#FFD700" />
                                            </View>
                                        </View>
                                        <View style={styles.confirmRow}>
                                            <Text style={styles.confirmLabel}>PRIZE POOL:</Text>
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <Text style={[styles.confirmValue, { color: COLORS.success }]}>{selectedTable.prize}</Text>
                                                <Coins size={16} color={COLORS.success} />
                                            </View>
                                        </View>
                                    </View>
                                )}
                            </View>

                            {/* Modal Footer (Buttons) */}
                            <View style={styles.modalFooter}>
                                <TouchableOpacity
                                    style={styles.modalCancelBtn}
                                    onPress={() => setModalVisible(false)}
                                >
                                    <Text style={styles.modalCancelText}>{isLocked ? "CLOSE" : "CANCEL"}</Text>
                                </TouchableOpacity>

                                {!isLocked && (
                                    <TouchableOpacity
                                        style={styles.modalConfirmBtn}
                                        onPress={handleConfirmPlay}
                                    >
                                        <LinearGradient
                                            colors={['#00b09b', '#96c93d']}
                                            style={styles.modalConfirmGradient}
                                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                        >
                                            <Text style={styles.modalConfirmText}>PLAY NOW</Text>
                                        </LinearGradient>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </LinearGradient>
                    </View>
                </View>
            </Modal>
        );
    };

    const renderSearchingModal = () => {
        return (
            <Modal
                animationType="fade"
                transparent={true}
                visible={isSearching}
                onRequestClose={() => { }}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { borderColor: COLORS.primary, backgroundColor: '#000' }]}>
                        <LinearGradient
                            colors={['#1a1a1a', '#000']}
                            style={[styles.modalGradient, { paddingVertical: 40 }]}
                        >
                            <Text style={[styles.modalTitle, { marginBottom: 30, color: COLORS.primary }]}>FINDING MATCH...</Text>

                            {/* Matchmaking Visuals */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 40, width: '100%' }}>
                                {/* You */}
                                <View style={{ alignItems: 'center' }}>
                                    <View style={{ width: 70, height: 70, borderRadius: 35, borderWidth: 2, borderColor: COLORS.success, overflow: 'hidden' }}>
                                        {/* Placeholder for User Avatar - In real app use UserAvatar component */}
                                        <View style={{ flex: 1, backgroundColor: '#333', alignItems: 'center', justifyContent: 'center' }}>
                                            <Trophy size={30} color={COLORS.success} />
                                        </View>
                                    </View>
                                    <Text style={{ color: '#FFF', marginTop: 10, fontWeight: 'bold' }}>YOU</Text>
                                </View>

                                {/* VS / Search Pulse */}
                                <Animated.View style={{ marginHorizontal: 20, transform: [{ scale: pulseAnim }] }}>
                                    <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' }}>
                                        <Search size={24} color={COLORS.primary} />
                                    </View>
                                </Animated.View>

                                {/* Opponent */}
                                <View style={{ alignItems: 'center' }}>
                                    <View style={{ width: 70, height: 70, borderRadius: 35, borderWidth: 2, borderColor: '#555', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: '#222' }}>
                                        <Text style={{ color: '#555', fontSize: 30, fontWeight: 'bold' }}>?</Text>
                                    </View>
                                    <Text style={{ color: '#555', marginTop: 10, fontWeight: 'bold' }}>OPPONENT</Text>
                                </View>
                            </View>

                            <Text style={{ color: COLORS.textDim, textAlign: 'center', marginBottom: 20 }}>
                                Looking for player in <Text style={{ color: '#FFF', fontWeight: 'bold' }}>{selectedTable?.city || 'Arena'}</Text>...
                            </Text>

                            <ActivityIndicator size="small" color={COLORS.primary} style={{ marginBottom: 30 }} />

                            <TouchableOpacity
                                style={[styles.modalCancelBtn, { width: '60%', backgroundColor: 'rgba(255, 107, 107, 0.2)', borderWidth: 1, borderColor: COLORS.error }]}
                                onPress={handleCancelSearch}
                            >
                                <Text style={[styles.modalCancelText, { color: COLORS.error }]}>CANCEL</Text>
                            </TouchableOpacity>
                        </LinearGradient>
                    </View>
                </View>
            </Modal>
        );
    };

    const renderCard = ({ item, index }) => {
        const inputRange = [
            (index - 1) * width,
            index * width,
            (index + 1) * width
        ];

        // Animations
        const scale = scrollX.interpolate({
            inputRange,
            outputRange: [0.9, 1, 0.9],
            extrapolate: 'clamp'
        });

        const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.6, 1, 0.6],
            extrapolate: 'clamp'
        });

        const isLevelLocked = userLevel < item.minLevel;
        const isBalanceLocked = !isLevelLocked && userBalance < item.entry;
        const isLocked = isLevelLocked || isBalanceLocked;

        return (
            <Animated.View style={[styles.cardWrapper, { transform: [{ scale }], opacity }]}>
                <TouchableOpacity
                    activeOpacity={0.95}
                    onPress={() => handleSelectTable(item)}
                    style={styles.cardContainer}
                >
                    <ImageBackground
                        source={item.image}
                        style={styles.cardImageBg}
                        imageStyle={{ borderRadius: 25 }}
                        blurRadius={isLocked ? 10 : 0}
                    >
                        {/* Dark Overlay Gradient */}
                        <LinearGradient
                            colors={isLocked ? ['rgba(0,0,0,0.5)', 'rgba(0,0,0,0.8)'] : ['transparent', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0.95)']}
                            style={styles.cardGradient}
                        >
                            {/* Top Badge */}
                            <View style={styles.topBadgeRow}>
                                <View style={[styles.levelBadge, { backgroundColor: item.accent }]}>
                                    <Star size={12} color="#000" fill="#000" />
                                    <Text style={styles.levelText}>{item.difficulty}</Text>
                                </View>
                                {!isLocked && (
                                    <View style={styles.onlineBadge}>
                                        <View style={styles.onlineDot} />
                                        <Text style={styles.onlineText}>{getRandomPlayers()} Live</Text>
                                    </View>
                                )}
                            </View>

                            {/* Main Content (Middle/Bottom) */}
                            <View style={styles.cardContent}>
                                {/* City Title with Shadow */}
                                <Text style={styles.cityTitle} numberOfLines={1} adjustsFontSizeToFit>{item.city}</Text>
                                <Text style={styles.citySubtitle}>ARENA</Text>

                                {/* Center Lock or Trophy */}
                                <View style={styles.centerIcon}>
                                    {isLocked ? (
                                        <View style={styles.lockContainer}>
                                            <Lock size={50} color="#FF6b6b" />
                                            <Text style={styles.lockText}>
                                                {isLevelLocked ? `Lvl ${item.minLevel}+ Required` : "Insufficient Funds"}
                                            </Text>
                                        </View>
                                    ) : (
                                        <View style={{ height: 60 }} /> // Spacer
                                    )}
                                </View>

                                {/* Stats Panel */}
                                <View style={[styles.statsPanel, isLocked && { opacity: 0.8 }]}>
                                    <View style={styles.statBox}>
                                        <Text style={styles.statLabel}>PRIZE POOL</Text>
                                        <Text style={[styles.statValue, { color: COLORS.success }]}>{item.prize}</Text>
                                    </View>
                                    <View style={styles.statDivider} />
                                    <View style={styles.statBox}>
                                        <Text style={styles.statLabel}>ENTRY FEE</Text>
                                        <Text style={[styles.statValue, { color: '#FFD700' }]}>{item.entry}</Text>
                                    </View>
                                </View>

                                {/* Play Button */}
                                <View style={[styles.playBtn, { backgroundColor: isLocked ? '#444' : item.accent }]}>
                                    <Text style={styles.playBtnText}>
                                        {isLocked ? "LOCKED" : "ENTER ARENA"}
                                    </Text>
                                    {!isLocked && <ChevronRight size={20} color="#000" style={{ marginLeft: 5 }} />}
                                </View>
                            </View>
                        </LinearGradient>

                        {/* Border Glow for Unlocked */}
                        {!isLocked && <View style={[styles.borderGlow, { borderColor: item.accent }]} />}
                        {/* Border for Locked */}
                        {isLocked && <View style={[styles.borderGlow, { borderColor: '#555', borderWidth: 2 }]} />}

                    </ImageBackground>
                </TouchableOpacity>
            </Animated.View>
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
                    <View style={styles.balancePill}>
                        <Text style={styles.balanceText}>{userBalance}</Text>
                        <Coins size={16} color="#FFD700" style={{ marginLeft: 5 }} fill="#FFD700" />
                    </View>
                </View>

                {/* Animated Carousel */}
                <Animated.FlatList
                    ref={flatListRef}
                    data={TABLES}
                    renderItem={renderCard}
                    keyExtractor={item => item.id}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    snapToInterval={width}
                    decelerationRate="fast"
                    bounces={false}
                    onScroll={Animated.event(
                        [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                        { useNativeDriver: true }
                    )}
                    onMomentumScrollEnd={(ev) => {
                        const index = Math.round(ev.nativeEvent.contentOffset.x / width);
                        setActiveIndex(index);
                    }}
                    contentContainerStyle={{ alignItems: 'center' }}
                />

                {/* Pagination Dots */}
                <View style={styles.pagination}>
                    {TABLES.map((_, i) => {
                        const opacity = scrollX.interpolate({
                            inputRange: [(i - 1) * width, i * width, (i + 1) * width],
                            outputRange: [0.3, 1, 0.3],
                            extrapolate: 'clamp'
                        });
                        return (
                            <Animated.View
                                key={i}
                                style={[styles.dot, { opacity, backgroundColor: i === activeIndex ? COLORS.accent : '#FFF' }]}
                            />
                        );
                    })}
                </View>

                {/* Custom Modal */}
                {renderCustomModal()}
                {renderSearchingModal()}

            </View>
        </AppBackground>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, paddingVertical: 40 },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        marginBottom: 10,
        alignItems: 'center'
    },
    backBtn: {
        padding: 10,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 12
    },
    balancePill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#FFD700'
    },
    balanceText: { color: '#FFD700', fontWeight: 'bold', fontSize: 16 },

    // Card
    cardWrapper: {
        width: width,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardContainer: {
        width: CARD_WIDTH,
        height: 520,
        borderRadius: 25,
        ...SHADOWS.medium
    },
    cardImageBg: {
        flex: 1,
        borderRadius: 25,
        overflow: 'hidden',
        justifyContent: 'flex-end'
    },
    cardGradient: {
        flex: 1,
        justifyContent: 'space-between',
        padding: 20
    },
    borderGlow: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 25,
        borderWidth: 3,
        borderColor: 'transparent'
    },

    // Card Content
    topBadgeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10
    },
    levelBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 10
    },
    levelText: {
        fontSize: 12, fontWeight: 'bold', color: '#000', marginLeft: 4, textTransform: 'uppercase'
    },
    onlineBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 10
    },
    onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#00FF00', marginRight: 5 },
    onlineText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },

    cardContent: {
        alignItems: 'center',
        paddingBottom: 20
    },
    cityTitle: {
        color: '#FFF',
        fontSize: 42,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 2,
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowOffset: { width: 2, height: 2 },
        textShadowRadius: 10,
        textAlign: 'center',
        lineHeight: 50
    },
    citySubtitle: {
        color: '#DDD',
        fontSize: 14,
        letterSpacing: 8,
        fontWeight: 'bold',
        marginBottom: 20
    },
    centerIcon: {
        height: 80,
        justifyContent: 'center',
        alignItems: 'center'
    },
    lockContainer: { alignItems: 'center' },
    lockText: { color: '#FF6b6b', fontWeight: 'bold', marginTop: 5, backgroundColor: 'rgba(0,0,0,0.8)', padding: 5, borderRadius: 5 },

    statsPanel: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.1)',
        backdropFilter: 'blur(10px)', // iOS only
        borderRadius: 15,
        padding: 15,
        width: '100%',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)'
    },
    statBox: { flex: 1, alignItems: 'center' },
    statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
    statLabel: { color: '#AAA', fontSize: 10, fontWeight: 'bold', letterSpacing: 1, marginBottom: 5 },
    statValue: { fontSize: 22, fontWeight: '900' },

    playBtn: {
        width: '100%',
        paddingVertical: 18,
        borderRadius: 15,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOWS.medium
    },
    playBtnText: {
        color: '#000',
        fontSize: 18,
        fontWeight: '900',
        letterSpacing: 1
    },

    pagination: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        height: 20
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginHorizontal: 4
    },

    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)', // Dark overlay
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    modalContent: {
        width: '90%',
        borderRadius: 25,
        overflow: 'hidden',
        ...SHADOWS.medium,
    },
    modalLockedBorder: {
        borderWidth: 2,
        borderColor: '#FF6b6b',
    },
    modalUnlockedBorder: {
        borderWidth: 2,
        borderColor: '#FFD700',
    },
    modalGradient: {
        padding: 25,
        alignItems: 'center',
    },
    modalHeader: {
        alignItems: 'center',
        marginBottom: 20
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: '900',
        letterSpacing: 2,
        marginTop: 10,
        textTransform: 'uppercase'
    },
    modalBody: {
        width: '100%',
        marginBottom: 25
    },
    lockedMessageContainer: {
        padding: 15,
        backgroundColor: 'rgba(255, 107, 107, 0.1)',
        borderRadius: 15,
        borderWidth: 1,
        borderColor: 'rgba(255, 107, 107, 0.3)',
    },
    lockedMessageText: {
        textAlign: 'center',
        color: '#FFF',
        fontSize: 16,
        lineHeight: 24
    },
    confirmDetails: {
        alignItems: 'center'
    },
    confirmText: {
        color: '#DDD',
        fontSize: 18,
        marginBottom: 20
    },
    confirmRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)'
    },
    confirmLabel: {
        color: '#AAA',
        fontWeight: 'bold',
        fontSize: 14
    },
    confirmValue: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 18,
        marginRight: 5
    },
    modalFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        gap: 15
    },
    modalCancelBtn: {
        flex: 1,
        paddingVertical: 15,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center'
    },
    modalCancelText: {
        color: '#FFF',
        fontWeight: 'bold'
    },
    modalConfirmBtn: {
        flex: 1,
        borderRadius: 12,
        overflow: 'hidden'
    },
    modalConfirmGradient: {
        flex: 1,
        paddingVertical: 15,
        alignItems: 'center',
        justifyContent: 'center'
    },
    modalConfirmText: {
        color: '#FFF',
        fontWeight: '900',
        fontSize: 16
    },
    searchingIconContainer: {
        width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center', justifyContent: 'center', marginBottom: 10
    }
});
