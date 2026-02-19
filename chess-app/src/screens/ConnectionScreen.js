import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES, SHADOWS } from '../constants/theme';
import { UserPlus, Check, X, Users } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/authService';
import UserAvatar from '../components/UserAvatar';
import AppBackground from '../components/AppBackground';

export default function ConnectionScreen() {
    const [connections, setConnections] = useState([]);
    const [pending, setPending] = useState([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [searchName, setSearchName] = useState('');

    useFocusEffect(
        useCallback(() => {
            fetchConnections();
        }, [])
    );

    const fetchConnections = async () => {
        try {
            const res = await api.get('/users/connections');
            setConnections(res.data.connections);
            setPending(res.data.pending);
        } catch (error) {
            console.log(error);
        }
    };

    const sendRequest = async () => {
        if (!searchName.trim()) return;
        try {
            await api.post('/users/request', { targetGamingName: searchName });
            Alert.alert("Success", "Request Sent!");
            setModalVisible(false);
            setSearchName('');
            fetchConnections();
        } catch (error) {
            Alert.alert("Error", error.response?.data?.msg || "Failed to send request");
        }
    };

    const handleRequest = async (userId, action) => {
        try {
            await api.put('/users/request/handle', { targetUserId: userId, action });
            fetchConnections();
        } catch (error) {
            Alert.alert("Error", "Action failed");
        }
    };

    const renderPending = ({ item }) => (
        <View style={styles.requestCard}>
            <View style={styles.row}>
                <UserAvatar avatarId={item.userId.avatarId} size={40} />
                <Text style={styles.reqName}>{item.userId.gamingName}</Text>
            </View>
            <View style={styles.row}>
                <TouchableOpacity onPress={() => handleRequest(item.userId._id, 'accept')} style={[styles.actionBtn, { backgroundColor: COLORS.success }]}>
                    <Check size={16} color="#FFF" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleRequest(item.userId._id, 'reject')} style={[styles.actionBtn, { backgroundColor: COLORS.error, marginLeft: 10 }]}>
                    <X size={16} color="#FFF" />
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderConnection = ({ item }) => (
        <View style={styles.friendCard}>
            <UserAvatar avatarId={item.userId.avatarId} size={50} />
            <View style={styles.friendInfo}>
                <Text style={styles.friendName}>{item.userId.gamingName}</Text>
                <Text style={styles.friendStats}>Wins: {item.userId.stats?.wins || 0} | Coins: {item.userId.coins || 0}</Text>
            </View>
            <View style={styles.statusDot} />
        </View>
    );

    return (
        <AppBackground>
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>Connections</Text>
                    <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addBtn}>
                        <UserPlus color="#FFF" size={24} />
                    </TouchableOpacity>
                </View>

                {pending.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Pending Requests</Text>
                        <FlatList
                            data={pending}
                            renderItem={renderPending}
                            keyExtractor={item => item._id}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                        />
                    </View>
                )}

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>My Friends</Text>
                    <FlatList
                        data={connections}
                        renderItem={renderConnection}
                        keyExtractor={item => item._id}
                        ListEmptyComponent={<Text style={styles.emptyText}>No connections yet. Add friends!</Text>}
                    />
                </View>

                <Modal animationType="slide" transparent={true} visible={modalVisible}>
                    <View style={styles.modalView}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Add Connection</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter Gaming Name"
                                placeholderTextColor={COLORS.textDim}
                                value={searchName}
                                onChangeText={setSearchName}
                            />
                            <View style={styles.modalActions}>
                                <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalBtnCancel}>
                                    <Text style={styles.btnText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={sendRequest} style={styles.modalBtnAdd}>
                                    <Text style={styles.btnText}>Send</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            </View>
        </AppBackground>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 40, marginBottom: 20 },
    title: { fontSize: 28, fontWeight: 'bold', color: COLORS.text },
    addBtn: { padding: 10, backgroundColor: COLORS.primary, borderRadius: 10 },
    section: { marginBottom: 20 },
    sectionTitle: { color: COLORS.textDim, marginBottom: 10, fontSize: 16, fontWeight: '600' },
    requestCard: { backgroundColor: COLORS.bgDark2, padding: 15, borderRadius: 12, marginRight: 15, width: 180, ...SHADOWS.medium },
    row: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    reqName: { color: COLORS.text, fontWeight: 'bold', marginLeft: 10 },
    actionBtn: { padding: 8, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    friendCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.glass, padding: 15, borderRadius: 12, marginBottom: 10 },
    friendInfo: { flex: 1, marginLeft: 15 },
    friendName: { color: COLORS.text, fontSize: 18, fontWeight: 'bold' },
    friendStats: { color: COLORS.textDim, fontSize: 12 },
    statusDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.success }, // Online status placeholder
    emptyText: { color: COLORS.textDim, fontStyle: 'italic', textAlign: 'center', marginTop: 20 },
    modalView: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
    modalContent: { width: '80%', backgroundColor: COLORS.bgDark2, padding: 20, borderRadius: 15, alignItems: 'center' },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.text, marginBottom: 20 },
    input: { width: '100%', backgroundColor: 'rgba(0,0,0,0.3)', padding: 15, borderRadius: 8, color: COLORS.text, borderWidth: 1, borderColor: COLORS.glassBorder, marginBottom: 20 },
    modalActions: { flexDirection: 'row', width: '100%', justifyContent: 'space-between' },
    modalBtnCancel: { flex: 1, padding: 15, alignItems: 'center', marginRight: 10, backgroundColor: COLORS.error, borderRadius: 8 },
    modalBtnAdd: { flex: 1, padding: 15, alignItems: 'center', marginLeft: 10, backgroundColor: COLORS.primary, borderRadius: 8 },
    btnText: { color: '#FFF', fontWeight: 'bold' }
});
