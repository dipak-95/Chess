import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, Alert, Modal } from 'react-native';
import { COLORS, SHADOWS, SIZES } from '../constants/theme';
import { Users, UserPlus, Play, Coins, ArrowRight, ClipboardCopy, Swords } from 'lucide-react-native';
import AppBackground from '../components/AppBackground';
import UserAvatar from '../components/UserAvatar';
import api from '../services/authService';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import socketService from '../services/socketService';

export default function PlayFriendsScreen() {
    const navigation = useNavigation();
    const [invitation, setInvitation] = useState(null); // { fromUser, amount, roomCode, challengeId }
    const [invitationModal, setInvitationModal] = useState(false);

    // State for User Balance
    const [myCoins, setMyCoins] = useState(0);

    const fetchUserData = async () => {
        try {
            const userStr = await AsyncStorage.getItem('user');
            if (userStr) {
                const u = JSON.parse(userStr);
                setMyCoins(u.coins || 0); // Show cached balance immediately

                try {
                    const res = await api.get('/auth/me');
                    if (res.data) {
                        setMyCoins(res.data.coins);
                        await AsyncStorage.setItem('user', JSON.stringify(res.data));
                        return;
                    }
                } catch (apiError) {
                    console.log("API fetch failed, keeping local storage data:", apiError);
                }
            }
        } catch (e) {
            console.log("Error fetching user data", e);
        }
    };

    // Friend & Room State
    const [friends, setFriends] = useState([]);
    const [roomCode, setRoomCode] = useState('');
    const [createRoomModal, setCreateRoomModal] = useState(false);
    const [joinRoomModal, setJoinRoomModal] = useState(false);
    const [betAmount, setBetAmount] = useState('100');
    const [generatedCode, setGeneratedCode] = useState('');

    // Error Modal Helper
    const [errorData, setErrorData] = useState({ visible: false, title: '', message: '' });
    const showError = (title, message) => setErrorData({ visible: true, title, message });

    const fetchFriends = async () => {
        try {
            const res = await api.get('/users/connections');
            // Init with offline status, check status via socket immediately
            const initFriends = res.data.connections.map(c => ({
                ...c,
                isOnline: false
            }));
            setFriends(initFriends);

            // Check online status immediately
            checkOnlineStatus(initFriends);
        } catch (error) {
            console.log("Error fetching friends", error);
        }
    };

    const checkOnlineStatus = (currentFriends) => {
        const friendIds = currentFriends.map(f => f.userId._id);
        if (friendIds.length > 0) {
            socketService.socket?.emit('check_online_status', friendIds);
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            fetchFriends();
            fetchUserData();

            // Set up polling for status updates every 5 seconds
            const interval = setInterval(() => {
                setFriends(prev => {
                    checkOnlineStatus(prev);
                    return prev;
                });
            }, 5000);

            return () => clearInterval(interval);
        }, [])
    );

    useEffect(() => {
        // Listen for status results
        socketService.on('online_status_result', (statuses) => {
            setFriends(prev => prev.map(f => {
                const status = statuses.find(s => s.userId === f.userId._id);
                return status ? { ...f, isOnline: status.isOnline } : f;
            }));
        });

        // ... existing listeners
        socketService.on('receive_challenge', (data) => {
            console.log("Challenge Received:", data);
            setInvitation(data);
            setInvitationModal(true);
        });

        socketService.on('challenge_rejected', (data) => {
            Alert.alert("Declined", `${data.userName} rejected your challenge.`);
        });

        return () => {
            socketService.off('online_status_result'); // Cleanup
            socketService.off('receive_challenge');
            socketService.off('challenge_rejected');
        };
    }, []);

    const handleCreateRoom = () => {
        const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        setGeneratedCode(newCode);
        setCreateRoomModal(true);
    };

    const handleJoinRoom = () => {
        setJoinRoomModal(true);
    };

    const enterRoom = () => {
        if (roomCode.length < 4) {
            showError("Error", "Invalid Room Code");
            return;
        }
        setJoinRoomModal(false);
        // Manual Joiner receives betAmount on 'game_start' from server
        // Note: We can't validate balance here easily without server check beforehand or handling it in game start
        navigation.navigate('Game', { mode: 'multiplayer', roomCode });
    };

    const handleAcceptChallenge = () => {
        if (!invitation) return;

        if (myCoins < invitation.amount) {
            showError("Insufficient Funds", "You don't have enough coins to accept this challenge.");
            return;
        }

        // Notify Sender
        socketService.acceptChallenge(invitation);
        setInvitationModal(false);

        // Join the Room with Bet Amount
        navigation.navigate('Game', {
            mode: 'multiplayer',
            roomCode: invitation.roomCode,
            betAmount: invitation.amount,
            myColor: 'b' // Joiner is Black
        });
    };

    const handleRejectChallenge = () => {
        if (!invitation) return;

        // Notify Sender
        AsyncStorage.getItem('user').then(u => {
            const user = JSON.parse(u);
            socketService.rejectChallenge(invitation, user.gamingName);
        });

        setInvitationModal(false);
        setInvitation(null);
    };

    const [challengeModal, setChallengeModal] = useState(false);
    const [challengeAmount, setChallengeAmount] = useState('100');
    const [selectedFriendId, setSelectedFriendId] = useState(null);

    const openChallengeModal = (friendId) => {
        setSelectedFriendId(friendId);
        setChallengeAmount('100');
        setChallengeModal(true);
    };

    const handleSendChallenge = async () => {
        const amount = parseInt(challengeAmount);
        if (isNaN(amount) || amount < 50) {
            showError("Invalid Amount", "Minimum bet amount is 50 coins.");
            return;
        }

        if (myCoins < amount) {
            showError("Insufficient Funds", `You only have ${myCoins} coins.`);
            return;
        }

        const userStr = await AsyncStorage.getItem('user');
        const user = JSON.parse(userStr);

        // Generate Room Code
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();

        // Emit Challenge
        socketService.sendChallenge(user, selectedFriendId, amount, code);

        setChallengeModal(false);

        // Navigate to Game as HOST and wait
        navigation.navigate('Game', {
            mode: 'multiplayer',
            roomCode: code,
            isHost: true,
            isChallenge: true, // Flag to know we are waiting for specific friend
            betAmount: amount,
            myColor: 'w' // Host is White
        });
    };

    const renderFriend = ({ item }) => (
        <View style={styles.friendCard}>
            <View style={styles.friendInfo}>
                <UserAvatar avatarId={item.userId.avatarId} size={50} />
                <View style={{ marginLeft: 15 }}>
                    <Text style={styles.friendName}>{item.userId.gamingName}</Text>
                    <View style={styles.statusRow}>
                        <View style={[styles.statusDot, { backgroundColor: item.isOnline ? COLORS.success : COLORS.textDim }]} />
                        <Text style={styles.statusText}>{item.isOnline ? 'Online' : 'Offline'}</Text>
                    </View>
                </View>
            </View>

            {item.isOnline && (
                <TouchableOpacity onPress={() => openChallengeModal(item.userId._id)} style={styles.challengeBtn}>
                    <Swords color="#FFF" size={20} />
                    <Text style={styles.challengeText}>Play</Text>
                </TouchableOpacity>
            )}
        </View>
    );

    return (
        <AppBackground>
            <View style={styles.container}>
                <Text style={styles.screenTitle}>Play with Friends</Text>

                {/* Section 1: Room Codes */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Room Match</Text>
                    <View style={styles.roomActions}>
                        <TouchableOpacity style={[styles.actionCard, { marginRight: 10 }]} onPress={handleCreateRoom}>
                            <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.gradientCard}>
                                <Play color="#FFF" size={32} />
                                <Text style={styles.actionTitle}>Create Room</Text>
                                <Text style={styles.actionSubtitle}>Share code & play</Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.actionCard, { marginLeft: 10 }]} onPress={handleJoinRoom}>
                            <View style={[styles.gradientCard, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                                <Users color="#FFF" size={32} />
                                <Text style={styles.actionTitle}>Join Room</Text>
                                <Text style={styles.actionSubtitle}>Enter code to join</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Section 2: Online Friends */}
                <View style={[styles.section, { flex: 1 }]}>
                    <Text style={styles.sectionTitle}>Active Friends</Text>
                    <FlatList
                        data={friends}
                        renderItem={renderFriend}
                        keyExtractor={(item) => item._id}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyText}>No friends online right now.</Text>
                                <TouchableOpacity onPress={() => navigation.navigate('Connections')} style={styles.addFriendBtn}>
                                    <UserPlus color="#FFF" size={20} />
                                    <Text style={styles.addFriendText}>Add Friends</Text>
                                </TouchableOpacity>
                            </View>
                        }
                    />
                </View>

                {/* ERROR ALERT MODAL */}
                <Modal visible={errorData.visible} transparent animationType="fade">
                    <View style={styles.modalOverlay}>
                        <View style={[styles.modalContent, { borderColor: COLORS.error }]}>
                            <Coins color={COLORS.error} size={48} style={{ marginBottom: 15 }} />
                            <Text style={[styles.modalTitle, { color: COLORS.error }]}>{errorData.title}</Text>
                            <Text style={{ color: COLORS.text, textAlign: 'center', marginBottom: 20, fontSize: 16 }}>
                                {errorData.message}
                            </Text>

                            <TouchableOpacity
                                style={[styles.primaryBtn, { backgroundColor: COLORS.error }]}
                                onPress={() => setErrorData({ ...errorData, visible: false })}
                            >
                                <Text style={styles.btnText}>Got it</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>

                {/* Create Room Modal */}
                <Modal visible={createRoomModal} transparent animationType="slide">
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Room Created!</Text>
                            <Text style={styles.codeLabel}>Share this code:</Text>

                            <TouchableOpacity style={styles.codeDisplay}>
                                <Text style={styles.codeText}>{generatedCode}</Text>
                                <ClipboardCopy color={COLORS.primary} size={20} />
                            </TouchableOpacity>

                            <View style={styles.betSection}>
                                <Coins color="#FFD700" size={24} />
                                <Text style={styles.betLabel}>Entry Fee:</Text>
                                <TextInput
                                    style={styles.betInput}
                                    value={betAmount}
                                    onChangeText={setBetAmount}
                                    keyboardType="numeric"
                                />
                            </View>

                            <TouchableOpacity
                                style={styles.primaryBtn}
                                onPress={() => {
                                    const amount = parseInt(betAmount);
                                    if (isNaN(amount) || amount < 50) {
                                        showError("Invalid Amount", "Minimum bet is 50 coins");
                                        return;
                                    }
                                    if (myCoins < amount) {
                                        showError("Insufficient Funds", `You only have ${myCoins} coins.`);
                                        return;
                                    }
                                    setCreateRoomModal(false);
                                    navigation.navigate('Game', {
                                        mode: 'multiplayer',
                                        roomCode: generatedCode,
                                        betAmount: betAmount,
                                        isHost: true,
                                        myColor: 'w'
                                    });
                                }}
                            >
                                <Text style={styles.btnText}>Enter Lobby</Text>
                            </TouchableOpacity>

                            <TouchableOpacity onPress={() => setCreateRoomModal(false)} style={styles.cancelBtn}>
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>

                {/* Join Room Modal */}
                <Modal visible={joinRoomModal} transparent animationType="slide">
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Join Room</Text>

                            <TextInput
                                style={styles.codeInput}
                                placeholder="Enter 6-digit Code"
                                placeholderTextColor={COLORS.textDim}
                                value={roomCode}
                                onChangeText={setRoomCode}
                                autoCapitalize="characters"
                                maxLength={6}
                            />

                            <TouchableOpacity style={styles.primaryBtn} onPress={enterRoom}>
                                <Text style={styles.btnText}>Join Game</Text>
                            </TouchableOpacity>

                            <TouchableOpacity onPress={() => setJoinRoomModal(false)} style={styles.cancelBtn}>
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>

                {/* CHALLENGE INVITATION MODAL */}
                <Modal visible={invitationModal} transparent animationType="fade">
                    <View style={styles.modalOverlay}>
                        <View style={[styles.modalContent, { borderColor: COLORS.accent }]}>
                            <Text style={styles.modalTitle}>⚔️ Duel Challenge!</Text>

                            <UserAvatar avatarId={invitation?.fromUser?.avatarId || 'avatar_01'} size={80} />

                            <Text style={{ color: COLORS.text, fontSize: 18, marginVertical: 10 }}>
                                <Text style={{ fontWeight: 'bold', color: COLORS.accent }}>{invitation?.fromUser?.gamingName}</Text> wants to play!
                            </Text>

                            <View style={styles.betSection}>
                                <Coins color="#FFD700" size={24} />
                                <Text style={styles.betLabel}>{invitation?.amount} Coins</Text>
                            </View>

                            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: COLORS.success }]} onPress={handleAcceptChallenge}>
                                <Text style={styles.btnText}>ACCEPT</Text>
                            </TouchableOpacity>

                            <TouchableOpacity onPress={handleRejectChallenge} style={styles.cancelBtn}>
                                <Text style={[styles.cancelText, { color: COLORS.error }]}>Decline</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>

                {/* SEND CHALLENGE MODAL */}
                <Modal visible={challengeModal} transparent animationType="slide">
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Send Challenge</Text>
                            <Text style={{ color: COLORS.textDim, marginBottom: 20 }}>Enter amount to bet (Min: 50)</Text>

                            <View style={styles.betSection}>
                                <Coins color="#FFD700" size={24} />
                                <TextInput
                                    style={[styles.betInput, { width: 100 }]}
                                    value={challengeAmount}
                                    onChangeText={setChallengeAmount}
                                    keyboardType="numeric"
                                    selectTextOnFocus
                                />
                            </View>

                            <TouchableOpacity style={styles.primaryBtn} onPress={handleSendChallenge}>
                                <Text style={styles.btnText}>Send Challenge</Text>
                            </TouchableOpacity>

                            <TouchableOpacity onPress={() => setChallengeModal(false)} style={styles.cancelBtn}>
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>

            </View>
        </AppBackground>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, paddingTop: 60 },
    screenTitle: { fontSize: 28, fontWeight: 'bold', color: COLORS.text, marginBottom: 30 },
    section: { marginBottom: 30 },
    sectionTitle: { fontSize: 18, color: COLORS.textDim, marginBottom: 15, fontWeight: '600' },

    roomActions: { flexDirection: 'row', justifyContent: 'space-between' },
    actionCard: { flex: 1, height: 140, borderRadius: 20, overflow: 'hidden', ...SHADOWS.medium },
    gradientCard: { flex: 1, padding: 20, justifyContent: 'center', alignItems: 'center' },
    actionTitle: { color: COLORS.text, fontSize: 18, fontWeight: 'bold', marginTop: 10 },
    actionSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },

    friendCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.glass, padding: 15, borderRadius: 15, marginBottom: 10 },
    friendInfo: { flexDirection: 'row', alignItems: 'center' },
    friendName: { color: COLORS.text, fontSize: 16, fontWeight: 'bold' },
    statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
    statusText: { color: COLORS.textDim, fontSize: 12 },
    challengeBtn: { backgroundColor: COLORS.primary, flexDirection: 'row', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, alignItems: 'center' },
    challengeText: { color: '#FFF', fontWeight: 'bold', marginLeft: 5 },

    emptyContainer: { alignItems: 'center', marginTop: 20 },
    emptyText: { color: COLORS.textDim, marginBottom: 15 },
    addFriendBtn: { flexDirection: 'row', backgroundColor: COLORS.bgDark2, padding: 12, borderRadius: 12, alignItems: 'center' },
    addFriendText: { color: COLORS.text, marginLeft: 8, fontWeight: 'bold' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '85%', backgroundColor: COLORS.bgDark2, borderRadius: 25, padding: 30, alignItems: 'center', borderWidth: 1, borderColor: COLORS.glassBorder },
    modalTitle: { fontSize: 22, fontWeight: 'bold', color: COLORS.text, marginBottom: 20 },
    codeLabel: { color: COLORS.textDim, marginBottom: 10 },
    codeDisplay: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)', padding: 15, borderRadius: 12, marginBottom: 20, width: '100%', justifyContent: 'space-between' },
    codeText: { color: COLORS.primary, fontSize: 24, fontWeight: 'bold', letterSpacing: 2 },

    betSection: { flexDirection: 'row', alignItems: 'center', width: '100%', marginBottom: 20, backgroundColor: 'rgba(255, 215, 0, 0.1)', padding: 10, borderRadius: 10, justifyContent: 'center' },
    betLabel: { color: '#FFD700', marginLeft: 10, fontWeight: 'bold', marginRight: 10 },
    betInput: { color: '#FFD700', fontWeight: 'bold', fontSize: 18, borderBottomWidth: 1, borderBottomColor: '#FFD700', minWidth: 60, textAlign: 'center' },

    codeInput: { width: '100%', backgroundColor: 'rgba(0,0,0,0.3)', padding: 15, borderRadius: 12, color: COLORS.text, fontSize: 20, textAlign: 'center', letterSpacing: 2, borderWidth: 1, borderColor: COLORS.glassBorder, marginBottom: 20 },

    primaryBtn: { width: '100%', backgroundColor: COLORS.primary, padding: 15, borderRadius: 12, alignItems: 'center', marginBottom: 10 },
    btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
    cancelBtn: { padding: 10 },
    cancelText: { color: COLORS.textDim }
});
