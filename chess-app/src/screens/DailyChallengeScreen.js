import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, Dimensions, Animated, Modal, ScrollView, ActivityIndicator } from 'react-native';
import { Chess } from 'chess.js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Trophy, Share2, HelpCircle, Play, Clock, Medal, Coins, Undo, Lightbulb, X } from 'lucide-react-native';

import ChessBoard from '../components/ChessBoard';
import AppBackground from '../components/AppBackground';
import { COLORS, SHADOWS, SIZES } from '../constants/theme';
import CHALLENGES from '../data/dailyChallenges';
import api from '../services/authService';

const { width, height } = Dimensions.get('window');

export default function DailyChallengeScreen({ navigation }) {
    const [game, setGame] = useState(new Chess());
    const [challenge, setChallenge] = useState(null);
    const [selectedSquare, setSelectedSquare] = useState(null);
    const [possibleMoves, setPossibleMoves] = useState([]);
    const [moveHistory, setMoveHistory] = useState([]);
    const [viewWindow, setViewWindow] = useState(null);

    // Status: 'waiting' -> 'playing' -> 'solved' -> 'failed'
    const [status, setStatus] = useState('waiting');
    const [elapsedTime, setElapsedTime] = useState(0);
    const timerRef = useRef(null);
    const [loading, setLoading] = useState(false);

    // Results Modal
    const [showResults, setShowResults] = useState(false);
    const [leaderboardData, setLeaderboardData] = useState({ top10: [], myRank: null, totalParticipants: 0 });

    const [userCoins, setUserCoins] = useState(0);

    const calculateViewWindow = (chessGame) => {
        const board = chessGame.board();
        let minR = 7, maxR = 0, minC = 7, maxC = 0;
        let hasPieces = false;

        board.forEach((row, r) => {
            row.forEach((piece, c) => {
                if (piece) {
                    hasPieces = true;
                    if (r < minR) minR = r;
                    if (r > maxR) maxR = r;
                    if (c < minC) minC = c;
                    if (c > maxC) maxC = c;
                }
            });
        });

        if (!hasPieces) return { startRow: 0, endRow: 7, startCol: 0, endCol: 7 };

        // Add padding and make it at least 4x4 or 5x5 for 'Half Board' feel
        let startRow = Math.max(0, minR - 1);
        let endRow = Math.min(7, maxR + 1);
        let startCol = Math.max(0, minC - 1);
        let endCol = Math.min(7, maxC + 1);

        // Ensure at least 4x4
        while (endRow - startRow < 3 && (startRow > 0 || endRow < 7)) {
            if (startRow > 0) startRow--;
            if (endRow < 7 && endRow - startRow < 3) endRow++;
        }
        while (endCol - startCol < 3 && (startCol > 0 || endCol < 7)) {
            if (startCol > 0) startCol--;
            if (endCol < 7 && endCol - startCol < 3) endCol++;
        }

        return { startRow, endRow, startCol, endCol };
    };

    useEffect(() => {
        loadInitialData();
        return () => stopTimer();
    }, []);

    const loadInitialData = async () => {
        setLoading(true);
        try {
            // Load Challenge
            const now = new Date();
            const start = new Date(now.getFullYear(), 0, 0);
            const diff = now - start;
            const oneDay = 1000 * 60 * 60 * 24;
            const dayOfYear = Math.floor(diff / oneDay);
            const challengeIndex = dayOfYear % CHALLENGES.length;
            const todaysChallenge = CHALLENGES[challengeIndex];

            setChallenge(todaysChallenge);
            const newGame = new Chess(todaysChallenge.fen);
            setGame(newGame);
            setViewWindow(calculateViewWindow(newGame));

            // Load User Coins
            const userStr = await AsyncStorage.getItem('user');
            if (userStr) {
                const user = JSON.parse(userStr);
                setUserCoins(user.coins || 0);
            }

            // Check if already completed
            const res = await api.get('/daily-challenge/leaderboard');
            setLeaderboardData(res.data);
            if (res.data.myResult) {
                setStatus('completed');
                setElapsedTime(res.data.myResult.timeTaken);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleStartPress = async () => {
        if (userCoins < 100) {
            Alert.alert("Insufficient Coins", "You need 100 coins to enter the Daily Challenge.");
            return;
        }

        Alert.alert(
            "Enter Challenge",
            "This will cost 100 coins. Top 10 players today will win 1000 coins!",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Play Now",
                    onPress: async () => {
                        try {
                            setLoading(true);
                            const res = await api.post('/daily-challenge/start');
                            setUserCoins(res.data.coins);
                            // Update local storage user
                            const userStr = await AsyncStorage.getItem('user');
                            const user = JSON.parse(userStr);
                            user.coins = res.data.coins;
                            await AsyncStorage.setItem('user', JSON.stringify(user));

                            startChallenge();
                        } catch (err) {
                            Alert.alert("Error", err.response?.data?.msg || "Failed to start challenge");
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const startChallenge = () => {
        setStatus('playing');
        setElapsedTime(0);
        setMoveHistory([]);
        timerRef.current = setInterval(() => {
            setElapsedTime(prev => prev + 1);
        }, 1000);
    };

    const stopTimer = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const makeMove = (move) => {
        if (status !== 'playing') return;
        if (game.turn() !== challenge.turn) return;

        try {
            const newGame = new Chess(game.fen());
            const result = newGame.move(move);

            if (result) {
                setMoveHistory([...moveHistory, game.fen()]);
                setGame(newGame);
                setSelectedSquare(null);
                setPossibleMoves([]);

                if (newGame.isCheckmate()) {
                    handleSuccess();
                } else if (newGame.isDraw() || newGame.isStalemate()) {
                    Alert.alert("Failed", "It's a draw, but you need checkmate!");
                    resetBoard();
                } else {
                    // Simple AI response for multi-move puzzles
                    if (challenge.mateIn > 1) {
                        setTimeout(() => {
                            const moves = newGame.moves();
                            if (moves.length > 0) {
                                const randomMove = moves[Math.floor(Math.random() * moves.length)];
                                newGame.move(randomMove);
                                setGame(new Chess(newGame.fen()));
                            }
                        }, 300);
                    }
                }
            }
        } catch (e) { }
    };

    const handleSuccess = async () => {
        stopTimer();
        setStatus('solved');
        try {
            setLoading(true);
            await api.post('/daily-challenge/submit', { timeTaken: elapsedTime });
            const res = await api.get('/daily-challenge/leaderboard');
            setLeaderboardData(res.data);
            setTimeout(() => setShowResults(true), 500);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const resetBoard = () => {
        setGame(new Chess(challenge.fen));
        setMoveHistory([]);
        setSelectedSquare(null);
        setPossibleMoves([]);
    };

    const handleUndo = () => {
        if (moveHistory.length > 0) {
            const prevFen = moveHistory[moveHistory.length - 1];
            setGame(new Chess(prevFen));
            setMoveHistory(moveHistory.slice(0, -1));
        }
    };

    const handleHint = () => {
        if (userCoins < 100) {
            Alert.alert("Insufficient Coins", "Hint costs 100 coins.");
            return;
        }
        // Logic for hint can be added here (e.g., highlighting the best piece to move)
        Alert.alert("Hint", "Look for a powerful move with your " + (challenge.turn === 'w' ? "White" : "Black") + " pieces!");
    };

    const onSquarePress = (square) => {
        if (status !== 'playing') return;
        const piece = game.get(square);
        if (piece && piece.color === game.turn()) {
            setSelectedSquare(square);
            const moves = game.moves({ square, verbose: true }).map(m => m.to);
            setPossibleMoves(moves);
            return;
        }
        if (selectedSquare) {
            makeMove({ from: selectedSquare, to: square, promotion: 'q' });
        }
    };

    if (!challenge || loading && status === 'waiting') {
        return (
            <View style={[styles.container, { justifyContent: 'center', backgroundColor: '#5FB6E1' }]}>
                <ActivityIndicator size="large" color="#FFF" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#5FB6E1', '#3296C8']} style={StyleSheet.absoluteFill} />

            <View style={styles.content}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
                        <ArrowLeft color="#FFF" size={24} />
                    </TouchableOpacity>

                    <View style={styles.headerCenter}>
                        <Text style={styles.levelText}>Level {challenge.mateIn + 5}</Text>
                        <Text style={styles.mateTitle}>Mate in {challenge.mateIn}</Text>
                    </View>

                    <View style={styles.coinPill}>
                        <Coins size={18} color="#FFD700" fill="#FFD700" />
                        <Text style={styles.coinText}>{userCoins}</Text>
                        <TouchableOpacity style={styles.plusBtn}>
                            <Text style={styles.plusText}>+</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* The Board Area */}
                <View style={styles.boardWrapper}>
                    <View style={[styles.boardContainer, status === 'solved' && { borderColor: '#FFF', borderWidth: 4 }]}>
                        <ChessBoard
                            board={game.board()}
                            selectedSquare={selectedSquare}
                            possibleMoves={possibleMoves}
                            onSquarePress={onSquarePress}
                            lastMove={null}
                            checkSquare={game.inCheck() ? 'k' : null}
                            flip={challenge.turn === 'b'}
                            viewWindow={viewWindow}
                            showNotations={false}
                            theme={{ light: '#F0D9B5', dark: '#B58863' }} // Wood theme matching Image 2
                        />

                        {/* Overlays */}
                        {status === 'waiting' && (
                            <View style={styles.overlay}>
                                <TouchableOpacity style={styles.playMainBtn} onPress={handleStartPress}>
                                    <Play fill="#FFF" color="#FFF" size={30} style={{ marginRight: 10 }} />
                                    <Text style={styles.playMainText}>PLAY (100 💰)</Text>
                                </TouchableOpacity>
                                <Text style={styles.overlayHint}>Top 10 win 1000 💰 daily!</Text>
                            </View>
                        )}

                        {status === 'completed' && (
                            <View style={styles.overlay}>
                                <Trophy size={60} color="#FFD700" />
                                <Text style={styles.completedText}>SOLVED</Text>
                                <TouchableOpacity style={styles.viewResultsBtn} onPress={() => setShowResults(true)}>
                                    <Text style={styles.viewResultsText}>LEADERBOARD</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>

                {/* Timer Floating */}
                {status === 'playing' && (
                    <View style={styles.floatingTimer}>
                        <Clock size={16} color="#FFF" />
                        <Text style={styles.floatingTimerText}>{formatTime(elapsedTime)}</Text>
                    </View>
                )}

                {/* Bottom Controls */}
                <View style={styles.controlsRow}>
                    <View style={styles.controlGroup}>
                        <TouchableOpacity style={styles.circleBtn} onPress={handleHint}>
                            <Lightbulb color="#FFF" size={32} />
                        </TouchableOpacity>
                        <Text style={styles.controlLabel}>Hint</Text>
                        <View style={styles.hintCostPill}>
                            <Coins size={12} color="#FFD700" fill="#FFD700" />
                            <Text style={styles.hintCostText}>100</Text>
                        </View>
                    </View>

                    <View style={styles.controlGroup}>
                        <TouchableOpacity
                            style={[styles.circleBtn, { opacity: moveHistory.length > 0 ? 1 : 0.5 }]}
                            onPress={handleUndo}
                            disabled={moveHistory.length === 0}
                        >
                            <Undo color="#FFF" size={32} />
                        </TouchableOpacity>
                        <Text style={styles.controlLabel}>Undo</Text>
                    </View>
                </View>

                {/* MODAL */}
                <Modal visible={showResults} transparent animationType="slide">
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <LinearGradient colors={['#1e2a44', '#0f172a']} style={styles.modalIn}>
                                <TouchableOpacity style={styles.modalClose} onPress={() => setShowResults(false)}>
                                    <X color="#FFF" size={24} />
                                </TouchableOpacity>

                                <Trophy size={80} color="#FFD700" style={{ marginTop: 20 }} />
                                <Text style={styles.modalTitle}>DAILY RESULTS</Text>

                                <View style={styles.userRankBox}>
                                    <Text style={styles.userRankLabel}>YOUR RANK</Text>
                                    <Text style={styles.userRankValue}>
                                        {leaderboardData.myRank ? `#${leaderboardData.myRank}` : 'N/A'}
                                    </Text>
                                    <Text style={styles.totalPartText}>out of {leaderboardData.totalParticipants} players</Text>
                                </View>

                                <Text style={styles.lbHeader}>TOP 10 TODAY</Text>
                                <ScrollView style={{ width: '100%' }} showsVerticalScrollIndicator={false}>
                                    {leaderboardData.top10.map((item, idx) => (
                                        <View key={idx} style={[styles.lbItem, item.userId === (leaderboardData.myResult?.userId) && styles.lbItemSelf]}>
                                            <Text style={[styles.lbPos, idx < 3 && { color: '#FFD700' }]}>#{idx + 1}</Text>
                                            <Text style={styles.lbName} numberOfLines={1}>{item.userName}</Text>
                                            <Text style={styles.lbTime}>{formatTime(item.timeTaken)}</Text>
                                        </View>
                                    ))}
                                    {leaderboardData.top10.length === 0 && (
                                        <Text style={{ color: COLORS.textDim, textAlign: 'center', marginTop: 20 }}>
                                            Be the first to solve today!
                                        </Text>
                                    )}
                                </ScrollView>

                                <TouchableOpacity style={styles.modalBtn} onPress={() => setShowResults(false)}>
                                    <Text style={styles.modalBtnText}>DONE</Text>
                                </TouchableOpacity>
                            </LinearGradient>
                        </View>
                    </View>
                </Modal>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { flex: 1, paddingTop: 40 },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        height: 60
    },
    headerCenter: { alignItems: 'center' },
    levelText: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase' },
    mateTitle: { color: '#FFF', fontSize: 32, fontWeight: '900' },
    iconBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12 },
    coinPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
        paddingLeft: 10,
        paddingRight: 2,
        paddingVertical: 2,
        borderRadius: 20,
    },
    coinText: { color: '#FFF', fontWeight: 'bold', marginHorizontal: 8, fontSize: 14 },
    plusBtn: { backgroundColor: '#4CAF50', width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    plusText: { color: '#FFF', fontWeight: 'bold', fontSize: 14, marginTop: -2 },

    boardWrapper: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    boardContainer: {
        width: width - 40,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 20,
        overflow: 'hidden',
        position: 'relative',
        elevation: 10,
        shadowOpacity: 0.5
    },

    overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
    playMainBtn: { flexDirection: 'row', backgroundColor: '#FFF', paddingHorizontal: 25, paddingVertical: 15, borderRadius: 30, alignItems: 'center' },
    playMainText: { color: '#3296C8', fontWeight: '900', fontSize: 18 },
    overlayHint: { color: 'rgba(255,255,255,0.8)', marginTop: 15, fontSize: 14, fontWeight: 'bold' },

    completedText: { color: '#FFF', fontSize: 28, fontWeight: '900', marginTop: 10, marginBottom: 20 },
    viewResultsBtn: { backgroundColor: '#FFD700', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 25 },
    viewResultsText: { color: '#000', fontWeight: 'bold' },

    controlsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingBottom: 60,
        paddingHorizontal: 40
    },
    controlGroup: { alignItems: 'center' },
    circleBtn: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        marginBottom: 8
    },
    controlLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: 'bold' },
    hintCostPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.4)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
        marginTop: 5
    },
    hintCostText: { color: '#FFD700', fontSize: 12, fontWeight: 'bold', marginLeft: 4 },

    floatingTimer: {
        position: 'absolute',
        top: 130,
        right: 20,
        backgroundColor: 'rgba(0,0,0,0.6)',
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: '#FFF'
    },
    floatingTimerText: { color: '#FFF', fontWeight: 'bold', marginLeft: 8 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: width * 0.9, height: height * 0.8, borderRadius: 30, overflow: 'hidden' },
    modalIn: { flex: 1, padding: 25, alignItems: 'center' },
    modalClose: { position: 'absolute', top: 20, right: 20, padding: 10 },
    modalTitle: { color: '#FFF', fontSize: 24, fontWeight: '900', letterSpacing: 2, marginTop: 10 },
    userRankBox: {
        width: '100%',
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 20,
        padding: 20,
        marginVertical: 20,
        alignItems: 'center'
    },
    userRankLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 'bold' },
    userRankValue: { color: '#FFD700', fontSize: 48, fontWeight: '900', marginVertical: 5 },
    totalPartText: { color: 'rgba(255,255,255,0.4)', fontSize: 12 },
    lbHeader: { color: '#FFF', fontSize: 16, fontWeight: 'bold', alignSelf: 'flex-start', marginBottom: 15 },
    lbItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)'
    },
    lbItemSelf: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 10, borderRadius: 10 },
    lbPos: { width: 40, color: 'rgba(255,255,255,0.5)', fontSize: 16 },
    lbName: { flex: 1, color: '#FFF', fontSize: 16 },
    lbTime: { color: '#C8A811', fontWeight: 'bold' },
    modalBtn: { backgroundColor: '#FFD700', width: '100%', paddingVertical: 18, borderRadius: 20, alignItems: 'center', marginTop: 20 },
    modalBtnText: { color: '#000', fontWeight: '900', fontSize: 16 }
});
