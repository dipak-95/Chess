import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Switch, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { COLORS, SHADOWS } from '../constants/theme';
import AppBackground from '../components/AppBackground';
import { ArrowLeft, ChevronRight } from 'lucide-react-native';

const SectionItem = ({ emoji, title, onPress }) => (
    <TouchableOpacity style={styles.itemContainer} onPress={onPress}>
        <View style={styles.itemLeft}>
            <View style={styles.iconBox}>
                <Text style={{ fontSize: 20 }}>{emoji}</Text>
            </View>
            <Text style={styles.itemTitle}>{title}</Text>
        </View>
        <ChevronRight color={COLORS.textDim} size={20} />
    </TouchableOpacity>
);

export default function SettingsScreen() {
    const navigation = useNavigation();

    // Modal States
    const [privacyVisible, setPrivacyVisible] = useState(false);
    const [howToPlayVisible, setHowToPlayVisible] = useState(false);

    // Mock Settings State
    const [soundEnabled, setSoundEnabled] = useState(true);

    return (
        <AppBackground>
            <SafeAreaView style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <ArrowLeft color="#FFF" size={24} />
                    </TouchableOpacity>
                    <Text style={styles.screenTitle}>Settings</Text>
                    <View style={{ width: 40 }} />
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 50 }}>

                    {/* General Section */}
                    <Text style={styles.sectionHeader}>General</Text>
                    <View style={styles.sectionCard}>
                        {/* Sound Toggle (Example) */}
                        <View style={styles.itemContainer}>
                            <View style={styles.itemLeft}>
                                <View style={[styles.iconBox, { backgroundColor: 'rgba(52, 152, 219, 0.2)' }]}>
                                    <Text style={{ fontSize: 20 }}>🔊</Text>
                                </View>
                                <Text style={styles.itemTitle}>Sound Effects</Text>
                            </View>
                            <Switch
                                value={soundEnabled}
                                onValueChange={setSoundEnabled}
                                trackColor={{ false: "#767577", true: COLORS.success }}
                                thumbColor={soundEnabled ? "#f4f3f4" : "#f4f3f4"}
                            />
                        </View>
                    </View>

                    {/* Information Section */}
                    <Text style={styles.sectionHeader}>Information</Text>
                    <View style={styles.sectionCard}>
                        <SectionItem
                            emoji="📖"
                            title="How to Play"
                            onPress={() => setHowToPlayVisible(true)}
                        />
                        <View style={styles.divider} />
                        <SectionItem
                            emoji="🛡️"
                            title="Privacy Policy"
                            onPress={() => setPrivacyVisible(true)}
                        />
                        <View style={styles.divider} />
                        <View style={styles.itemContainer}>
                            <View style={styles.itemLeft}>
                                <View style={[styles.iconBox, { backgroundColor: 'rgba(155, 89, 182, 0.2)' }]}>
                                    <Text style={{ fontSize: 20 }}>ℹ️</Text>
                                </View>
                                <Text style={styles.itemTitle}>App Version</Text>
                            </View>
                            <Text style={styles.versionText}>v1.0.2</Text>
                        </View>
                    </View>

                </ScrollView>

                {/* --- MODALS --- */}

                {/* Privacy Policy Modal */}
                <Modal visible={privacyVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setPrivacyVisible(false)}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Privacy Policy</Text>
                            <TouchableOpacity onPress={() => setPrivacyVisible(false)} style={styles.closeBtn}>
                                <Text style={styles.closeText}>Close</Text>
                            </TouchableOpacity>
                        </View>
                        <ScrollView contentContainerStyle={styles.modalContent}>
                            <Text style={styles.paragraph}>
                                <Text style={styles.bold}>Effective Date:</Text> Feb 1, 2026
                            </Text>
                            <Text style={styles.paragraph}>
                                Welcome to Chess Master! Your privacy is important to us. This Privacy Policy explains how we collect, use, and protect your information.
                            </Text>

                            <Text style={styles.heading}>1. Information We Collect</Text>
                            <Text style={styles.paragraph}>
                                - <Text style={styles.bold}>Account Info:</Text> When you sign up, we collect your gaming name, email, and password. {'\n'}
                                - <Text style={styles.bold}>Game Data:</Text> We store your match history, coins, stats (wins/losses), and unlocked avatars. {'\n'}
                                - <Text style={styles.bold}>Device Info:</Text> We may collect device model and OS version for debugging purposes.
                            </Text>

                            <Text style={styles.heading}>2. How We Use Information</Text>
                            <Text style={styles.paragraph}>
                                - To provide and maintain the Service. {'\n'}
                                - To track your progress, levels, and achievements. {'\n'}
                                - To facilitate multiplayer matchmaking. {'\n'}
                                - To improve app performance and fix bugs.
                            </Text>

                            <Text style={styles.heading}>3. Data Security</Text>
                            <Text style={styles.paragraph}>
                                We implement security measures to maintain the safety of your personal information. Your password is hashed and stored securely.
                            </Text>

                            <Text style={styles.heading}>4. Third-Party Services</Text>
                            <Text style={styles.paragraph}>
                                We may use third-party services like DiceBear for avatars or Socket.io for real-time communication.
                            </Text>

                            <Text style={styles.heading}>5. Contact Us</Text>
                            <Text style={styles.paragraph}>
                                If you have any questions about this Privacy Policy, please contact us at support@chessmaster.com.
                            </Text>
                            <View style={{ height: 50 }} />
                        </ScrollView>
                    </View>
                </Modal>

                {/* How to Play Modal */}
                <Modal visible={howToPlayVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setHowToPlayVisible(false)}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>How to Play</Text>
                            <TouchableOpacity onPress={() => setHowToPlayVisible(false)} style={styles.closeBtn}>
                                <Text style={styles.closeText}>Close</Text>
                            </TouchableOpacity>
                        </View>
                        <ScrollView contentContainerStyle={styles.modalContent}>
                            <Text style={styles.paragraph}>
                                Chess is a strategy board game played between two players. Here is a guide to help you master the game in our app.
                            </Text>

                            <Text style={styles.heading}>1. Game Objective</Text>
                            <Text style={styles.paragraph}>
                                The goal is to <Text style={styles.bold}>Checkmate</Text> the opponent's King. This happens when the King is under attack (Check) and has no legal move to escape.
                            </Text>

                            <Text style={styles.heading}>2. Piece Movements</Text>
                            <Text style={styles.paragraph}>
                                - <Text style={styles.bold}>King:</Text> Moves one square in any direction. {'\n'}
                                - <Text style={styles.bold}>Queen:</Text> Moves any number of squares diagonally, horizontally, or vertically. {'\n'}
                                - <Text style={styles.bold}>Rook:</Text> Moves any number of squares horizontally or vertically. {'\n'}
                                - <Text style={styles.bold}>Bishop:</Text> Moves any number of squares diagonally. {'\n'}
                                - <Text style={styles.bold}>Knight:</Text> Moves in an 'L' shape (2 squares one way, 1 square perpendicular). {'\n'}
                                - <Text style={styles.bold}>Pawn:</Text> Moves forward one square (two on first move). Captures diagonally forward.
                            </Text>

                            <Text style={styles.heading}>3. Game Modes</Text>
                            <Text style={styles.paragraph}>
                                - <Text style={styles.bold}>vs Computer:</Text> Practice against AI with different difficulty levels. {'\n'}
                                - <Text style={styles.bold}>Pass n Play:</Text> Play offline with a friend on the same device. {'\n'}
                                - <Text style={styles.bold}>Play Friends:</Text> Create a private room or join one to play online. Earn XP and Coins!
                            </Text>

                            <Text style={styles.heading}>4. Betting & Coins</Text>
                            <Text style={styles.paragraph}>
                                In multiplayer modes, you can bet coins. If you win, you take the pot! If you lose, you lose your bet.
                            </Text>

                            <View style={{ height: 50 }} />
                        </ScrollView>
                    </View>
                </Modal>

            </SafeAreaView>
        </AppBackground>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, paddingTop: 10, paddingHorizontal: 20 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 30, marginTop: 10 },
    backBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12 },
    screenTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.text },

    sectionHeader: { color: COLORS.textDim, fontSize: 14, fontWeight: 'bold', marginBottom: 10, marginLeft: 5, textTransform: 'uppercase' },
    sectionCard: { backgroundColor: COLORS.glass, borderRadius: 16, overflow: 'hidden', marginBottom: 25, borderWidth: 1, borderColor: COLORS.glassBorder },

    itemContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
    itemLeft: { flexDirection: 'row', alignItems: 'center' },
    iconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', marginRight: 15 },
    itemTitle: { color: COLORS.text, fontSize: 16, fontWeight: '600' },
    versionText: { color: COLORS.textDim, fontSize: 16 },

    divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginLeft: 65 },

    // Modal Styles
    modalContainer: { flex: 1, backgroundColor: '#FFF' },
    modalHeader: { padding: 20, paddingTop: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee' },
    modalTitle: { fontSize: 20, fontWeight: 'bold' },
    closeBtn: { padding: 5 },
    closeText: { color: COLORS.primary, fontSize: 16, fontWeight: '600' },
    modalContent: { padding: 20 },

    heading: { fontSize: 18, fontWeight: 'bold', marginTop: 20, marginBottom: 10, color: '#333' },
    paragraph: { fontSize: 16, lineHeight: 24, color: '#555', marginBottom: 10 },
    bold: { fontWeight: 'bold', color: '#000' }
});
