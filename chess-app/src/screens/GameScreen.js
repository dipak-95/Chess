import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, ActivityIndicator, Modal, Image, ScrollView, Dimensions, BackHandler } from 'react-native';
import { Chess } from 'chess.js';
import ChessBoard from '../components/ChessBoard';
import GameOverModal from '../components/GameOverModal'; // Import
import { getBestMove } from '../services/chessAI';
import AppBackground from '../components/AppBackground';
import { COLORS, SHADOWS, SIZES } from '../constants/theme';
import { ArrowLeft, RefreshCw, Trophy, Shield, Swords, Coins, X, UserPlus } from 'lucide-react-native';
import UserAvatar from '../components/UserAvatar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import socketService from '../services/socketService';

const { height } = Dimensions.get('window');

export default function GameScreen({ route, navigation }) {
    const { mode, difficulty, players, roomCode, opponent: initialOpponent, isHost, betAmount: initialBetAmount, myColor: initialColor } = route.params || { mode: 'computer', difficulty: 'medium' };

    const [game, setGame] = useState(new Chess());
    const [selectedSquare, setSelectedSquare] = useState(null);
    const [possibleMoves, setPossibleMoves] = useState([]);
    const [isAiThinking, setIsAiThinking] = useState(false);
    const [gameStatus, setGameStatus] = useState('');
    const [checkSquare, setCheckSquare] = useState(null);
    const [profileModalVisible, setProfileModalVisible] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);

    // Multiplayer State
    const [opponent, setOpponent] = useState(initialOpponent || null);
    const [waitingForOpponent, setWaitingForOpponent] = useState(mode === 'multiplayer' && !initialOpponent);
    const [socketConnected, setSocketConnected] = useState(socketService.socket?.connected || false);

    // UI State
    const [surrenderModalVisible, setSurrenderModalVisible] = useState(false);

    // EXIT HANDLING logic
    const handleBackPress = () => {
        if (mode === 'multiplayer' && !game.isGameOver() && !showGameOver && !waitingForOpponent) {
            setSurrenderModalVisible(true);
            return true; // handled
        }
        navigation.goBack();
        return true;
    };

    // Hardware Back Button Listener
    useEffect(() => {
        const subscription = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
        return () => subscription.remove();
    }, [mode, game, showGameOver, waitingForOpponent]); // Dependencies critical

    // Server assigns color now: 'w' or 'b'
    const [myColor, setMyColor] = useState(initialColor || null);

    // Game Over & Betting State
    const [betAmount, setBetAmount] = useState(initialBetAmount || 100);
    const [showGameOver, setShowGameOver] = useState(false);
    const [isMyWin, setIsMyWin] = useState(false);
    const [gameOverReason, setGameOverReason] = useState('');

    // Handle Game Over Flow
    const handleGameOver = (win, reason) => {
        setGameStatus(reason);
        setIsMyWin(win);
        setGameOverReason(reason);
        setShowGameOver(true);

        // Notify Server if I won (checkmate case)
        if (win && mode === 'multiplayer' && reason.includes('Checkmate')) {
            AsyncStorage.getItem('user').then(u => {
                const user = JSON.parse(u);
                socketService.gameOver(roomCode, user._id);
            });
        }

        // Navigate Home after animation
        setTimeout(() => {
            setShowGameOver(false);
            navigation.reset({
                index: 0,
                routes: [{ name: 'Main' }],
            });
        }, 8000); // 8 seconds for animation
    };

    // ...

    // Multiplayer Room Logic (THE FIX)
    const [reconnectTimer, setReconnectTimer] = useState(0);
    const [showReconnectModal, setShowReconnectModal] = useState(false);
    const [startModal, setStartModal] = useState({ visible: false, color: 'w' });

    // Countdown Timer Effect
    useEffect(() => {
        let interval;
        if (showReconnectModal && reconnectTimer > 0) {
            interval = setInterval(() => {
                setReconnectTimer((prev) => prev - 1);
            }, 1000);
        } else if (reconnectTimer === 0) {
            clearInterval(interval);
        }
        return () => clearInterval(interval);
    }, [showReconnectModal, reconnectTimer]);

    useEffect(() => {
        if (mode === 'multiplayer') {
            AsyncStorage.getItem('user').then(u => {
                const user = JSON.parse(u);

                // If just starting, join room
                if (roomCode) {
                    socketService.joinRoom(roomCode, user, betAmount);
                }

                // If we are recovering from a crash/background, try to rejoin
                socketService.rejoinGame(user._id);
            });

            // SERVER START EVENT (Reliable)
            socketService.on('game_start', ({ white, black }) => {
                console.log("GAME STARTED:", white.gamingName, "vs", black.gamingName);

                AsyncStorage.getItem('user').then(u => {
                    if (!u) return;
                    const me = JSON.parse(u);

                    // Determine My Color
                    if (me._id === white._id) {
                        setMyColor('w');
                        setOpponent(black);
                        setStartModal({ visible: true, color: 'w' });
                    } else if (me._id === black._id) {
                        setMyColor('b');
                        setOpponent(white);
                        setStartModal({ visible: true, color: 'b' });
                    }

                    // Auto hide start modal
                    setTimeout(() => {
                        setStartModal(prev => ({ ...prev, visible: false }));
                    }, 3000);

                    setWaitingForOpponent(false);
                });
            });

            // DISCONNECT / LEAVE WIN
            socketService.on('opponent_disconnected', ({ winner, betAmount, reason }) => {
                setShowReconnectModal(false);
                setBetAmount(betAmount);
                handleGameOver(true, reason || 'Opponent Disconnected');
            });

            // 15s Reconnect Warning
            socketService.on('opponent_reconnecting', ({ timeLeft }) => {
                setReconnectTimer(timeLeft);
                setShowReconnectModal(true);
            });

            // Opponent Back
            socketService.on('opponent_rejoined', () => {
                setShowReconnectModal(false);
                Alert.alert("Resumed", "Opponent has reconnected.");
            });

            socketService.on('receive_move', (data) => {
                const newGame = new Chess(data.fen);
                setGame(newGame);
                checkGameOver(newGame);
            });

            return () => {
                socketService.off('game_start');
                socketService.off('receive_move');
                socketService.off('opponent_disconnected');
                socketService.off('opponent_reconnecting');
                socketService.off('opponent_rejoined');
            };
        }
    }, [mode, roomCode]);


    // AI Turn Effect
    useEffect(() => {
        if (mode === 'computer' && game.turn() === 'b' && !game.isGameOver()) {
            setIsAiThinking(true);

            // Slower Move: Increased to 1.5s for realism
            setTimeout(() => {
                const bestMove = getBestMove(game, difficulty);
                if (bestMove) {
                    makeMove(bestMove);
                }
                setIsAiThinking(false);
            }, 1500);
        }
    }, [game, mode]);

    // Check Detection
    useEffect(() => {
        if (game.inCheck()) {
            const board = game.board();
            let kingSquare = null;
            // Find the King of the current turn
            for (let i = 0; i < 8; i++) {
                for (let j = 0; j < 8; j++) {
                    const piece = board[i][j];
                    if (piece && piece.type === 'k' && piece.color === game.turn()) {
                        kingSquare = String.fromCharCode(97 + j) + (8 - i);
                        break;
                    }
                }
            }
            setCheckSquare(kingSquare);
        } else {
            setCheckSquare(null);
        }
    }, [game]);

    const makeMove = (move, isReceivedInfo = false) => {
        const newGame = new Chess(game.fen());
        try {
            const result = newGame.move(move);
            if (result) {
                setGame(newGame);
                checkGameOver(newGame);
                setSelectedSquare(null);
                setPossibleMoves([]);

                // Only emit if *I* made the move (not if I received it)
                if (mode === 'multiplayer' && roomCode && !isReceivedInfo) {
                    socketService.makeMove(roomCode, move, newGame.fen());
                }

                return true;
            }
        } catch (e) {
            return false;
        }
        return false;
    };

    const onSquarePress = (square) => {
        if (isAiThinking || game.isGameOver()) return;

        // Multiplayer Turn & Color Restriction
        if (mode === 'multiplayer') {
            // 1. Is it my turn?
            if (myColor && game.turn() !== myColor) {
                return; // Not my turn
            }
            // 2. Am I trying to select an opponent's piece?
            if (!selectedSquare) {
                const piece = game.get(square);
                // If I have a color assigned, enforce it
                if (myColor && piece && piece.color !== myColor) {
                    return;
                }
            }
        }

        if (selectedSquare === square) {
            setSelectedSquare(null);
            setPossibleMoves([]);
            return;
        }

        if (selectedSquare && possibleMoves.includes(square)) {
            // Attempt move
            makeMove({ from: selectedSquare, to: square, promotion: 'q' });
            return;
        }

        const piece = game.get(square);
        if (piece && piece.color === game.turn()) {
            // Mode restrictions
            if (mode === 'computer' && piece.color === 'b') return;
            // Enforce color
            if (mode === 'multiplayer' && myColor && piece.color !== myColor) return;

            setSelectedSquare(square);
            const moves = game.moves({ square, verbose: true }).map(m => m.to);
            setPossibleMoves(moves);
        } else {
            setSelectedSquare(null);
            setPossibleMoves([]);
        }
    };

    const checkGameOver = (gameInstance) => {
        if (gameInstance.isCheckmate()) {
            const winnerColor = gameInstance.turn() === 'w' ? 'b' : 'w'; // If White turn, Black won
            const amIWinner = (myColor && myColor === winnerColor) || (!myColor && winnerColor === 'w'); // Default vs comp

            handleGameOver(amIWinner, 'Checkmate!');

        } else if (gameInstance.isDraw()) {
            // Draws typically refund? Or split? keeping simple.
            Alert.alert("Game Over", "Draw!");
            setGameStatus('Draw');
        } else if (gameInstance.inCheck()) {
            setGameStatus('Check!');
        } else {
            setGameStatus('');
        }
    };

    const resetGame = () => {
        setGame(new Chess());
        setGameStatus('');
        setSelectedSquare(null);
        setPossibleMoves([]);
        setCheckSquare(null);
    };

    // Render Player Logic
    const renderTopPlayer = () => {
        // If I am Black, Top Player is White (Opponent).
        // If I am White, Top Player is Black (Opponent).

        // Computer Mode
        if (mode === 'computer') {
            return (
                <View style={styles.playerInfo}>
                    <UserAvatar avatarId="avatar_05" size={50} />
                    <View style={styles.playerTextContainer}>
                        <Text style={styles.playerName}>Computer ({difficulty})</Text>
                        <Text style={styles.playerLevel}>AI Master</Text>
                    </View>
                    {isAiThinking && <ActivityIndicator size="small" color={COLORS.accent} />}
                </View>
            );
        }

        // Pass Mode (Standard: Black at top)
        if (mode === 'pass') {
            return (
                <View style={styles.playerInfo}>
                    <UserAvatar avatarId={players?.black?.avatarId || 'avatar_02'} size={50} />
                    <View style={styles.playerTextContainer}>
                        <Text style={styles.playerName}>{players?.black?.name || 'Player 2'}</Text>
                        <Text style={styles.playerLevel}>Level 1</Text>
                    </View>
                    {game.turn() === 'b' && <ActivityIndicator size="small" color={COLORS.error} />}
                </View>
            );
        }

        // Multiplayer (Opponent is ALWAYS at top)
        if (mode === 'multiplayer') {
            return (
                <TouchableOpacity style={styles.playerInfo} onPress={() => setProfileModalVisible(true)}>
                    <UserAvatar avatarId={opponent?.avatarId || "avatar_01"} size={50} />
                    <View style={styles.playerTextContainer}>
                        <Text style={styles.playerName}>{opponent ? opponent.gamingName : 'Waiting...'}</Text>
                        <Text style={styles.playerLevel}>Opponent</Text>
                    </View>
                    {/* Show Turn Indicator for Opponent */}
                    {myColor && game.turn() !== myColor && <ActivityIndicator size="small" color={COLORS.error} />}
                </TouchableOpacity>
            );
        }

        return null;
    };

    const renderBottomPlayer = () => {
        // Computer Mode (Me at bottom)
        if (mode === 'computer') {
            return (
                <View style={[styles.playerInfo, { marginTop: 20 }]}>
                    <UserAvatar avatarId={currentUser?.avatarId} size={50} />
                    <View style={styles.playerTextContainer}>
                        <Text style={styles.playerName}>{currentUser?.gamingName || 'You'}</Text>
                        <Text style={styles.playerLevel}>Level 1</Text>
                    </View>
                    {game.turn() === 'w' && <ActivityIndicator size="small" color={COLORS.success} />}
                </View>
            );
        }

        // Pass Mode (White at bottom)
        if (mode === 'pass') {
            return (
                <View style={[styles.playerInfo, { marginTop: 20 }]}>
                    <UserAvatar avatarId={players?.white?.avatarId || 'avatar_01'} size={50} />
                    <View style={styles.playerTextContainer}>
                        <Text style={styles.playerName}>{players?.white?.name || 'Player 1'}</Text>
                        <Text style={styles.playerLevel}>Level 1</Text>
                    </View>
                    {game.turn() === 'w' && <ActivityIndicator size="small" color={COLORS.success} />}
                </View>
            );
        }

        // Multiplayer (Me is ALWAYS at bottom)
        if (mode === 'multiplayer') {
            return (
                <View style={[styles.playerInfo, { marginTop: 20 }]}>
                    <UserAvatar avatarId={currentUser?.avatarId} size={50} />
                    <View style={styles.playerTextContainer}>
                        <Text style={styles.playerName}>{currentUser?.gamingName || 'You'}</Text>
                        <Text style={styles.playerLevel}>Level 1</Text>
                    </View>
                    {/* Show Turn Indicator for Me */}
                    {myColor && game.turn() === myColor && <ActivityIndicator size="small" color={COLORS.success} />}
                </View>
            );
        }

        return null;
    };

    // WAITING ROOM UI
    if (waitingForOpponent) {
        return (
            <AppBackground>
                <View style={styles.container}>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
                            <ArrowLeft color="#FFF" size={24} />
                        </TouchableOpacity>
                        <Text style={styles.title}>Lobby</Text>
                        <View style={{ width: 40 }} />
                    </View>

                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        {/* Connection Debug */}
                        <Text style={{ color: socketConnected ? COLORS.success : COLORS.error, marginBottom: 10, fontSize: 12, fontWeight: 'bold' }}>
                            {socketConnected ? '🟢 Server Connected' : '🔴 Server Disconnected (Check IP)'}
                        </Text>

                        <Text style={[styles.title, { marginBottom: 10 }]}>Wait For Opponent</Text>
                        <Text style={{ color: COLORS.textDim, marginBottom: 20 }}>Share Room Code:</Text>
                        <Text style={{ fontSize: 32, color: COLORS.primary, fontWeight: 'bold', marginBottom: 40, letterSpacing: 2 }}>{roomCode}</Text>

                        <ActivityIndicator size="large" color={COLORS.primary} />
                        <Text style={{ color: COLORS.textDim, marginTop: 20 }}>Waiting for player to join...</Text>
                    </View>
                </View>
            </AppBackground>
        );
    }

    return (
        <AppBackground>
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={handleBackPress} style={styles.iconBtn}>
                        <ArrowLeft color="#FFF" size={24} />
                    </TouchableOpacity>
                    <View style={{ alignItems: 'center' }}>
                        <Text style={styles.title}>{gameStatus || (mode === 'computer' ? 'Vs Computer' : mode === 'pass' ? 'Pass n Play' : 'Multiplayer')}</Text>
                    </View>
                    <TouchableOpacity onPress={resetGame} style={styles.iconBtn}>
                        <RefreshCw color="#FFF" size={24} />
                    </TouchableOpacity>
                </View>

                {/* Main Game Area Centered */}
                <View style={styles.gameArea}>

                    {/* Top Player (Black) */}
                    {renderTopPlayer()}

                    {/* Board */}
                    <View style={styles.boardContainer}>
                        <ChessBoard
                            board={game.board()}
                            selectedSquare={selectedSquare}
                            possibleMoves={possibleMoves}
                            onSquarePress={onSquarePress}
                            lastMove={null}
                            checkSquare={checkSquare}
                            flip={myColor === 'b'}
                        />
                    </View>

                    {/* Bottom Player (White) */}
                    {renderBottomPlayer()}

                </View>

                {/* Friend Profile Modal */}
                <Modal animationType="slide" transparent={true} visible={profileModalVisible}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <TouchableOpacity style={styles.closeBtn} onPress={() => setProfileModalVisible(false)}>
                                <X color="#FFF" size={24} />
                            </TouchableOpacity>

                            <UserAvatar avatarId={(opponent && opponent.avatarId) ? opponent.avatarId : "avatar_03"} size={100} />
                            <Text style={styles.modalName}>{(opponent && opponent.gamingName) ? opponent.gamingName : "Opponent"}</Text>
                            <Text style={styles.modalLevel}>Level 5 • Grandmaster</Text>

                            <View style={styles.statsGrid}>
                                <View style={styles.statItem}>
                                    <Swords color={COLORS.accent} size={24} />
                                    <Text style={styles.statValue}>142</Text>
                                    <Text style={styles.statLabel}>Matches</Text>
                                </View>
                                <View style={styles.statItem}>
                                    <Trophy color="#FFD700" size={24} />
                                    <Text style={styles.statValue}>89</Text>
                                    <Text style={styles.statLabel}>Won</Text>
                                </View>
                                <View style={styles.statItem}>
                                    <Shield color="#00CEC9" size={24} />
                                    <Text style={styles.statValue}>62%</Text>
                                    <Text style={styles.statLabel}>Win Rate</Text>
                                </View>
                                <View style={styles.statItem}>
                                    <Coins color="#FFA502" size={24} />
                                    <Text style={styles.statValue}>12,400</Text>
                                    <Text style={styles.statLabel}>Winnings</Text>
                                </View>
                            </View>

                            <View style={styles.avatarCount}>
                                <Text style={styles.statLabel}>Avatars Owned: 8/15</Text>
                            </View>

                            {/* Add Friend Button */}
                            {mode === 'multiplayer' && opponent && (
                                <TouchableOpacity
                                    style={styles.addFriendBtn}
                                    onPress={() => {
                                        socketService.sendFriendRequest(currentUser, opponent._id);
                                        Alert.alert("Request Sent", `Friend request sent to ${opponent.gamingName}`);
                                    }}
                                >
                                    <UserPlus color="#FFF" size={20} style={{ marginRight: 8 }} />
                                    <Text style={styles.addFriendText}>Add Friend</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </Modal>

                {/* START GAME MODAL */}
                <Modal transparent animationType="slide" visible={startModal.visible}>
                    <View style={styles.modalOverlay}>
                        <View style={[styles.modalContent, { borderColor: startModal.color === 'w' ? '#FFF' : '#333', backgroundColor: COLORS.bgDark }]}>
                            <Swords color={startModal.color === 'w' ? '#FFF' : '#AAA'} size={64} style={{ marginBottom: 20 }} />
                            <Text style={[styles.modalTitle, { fontSize: 28 }]}>Match Started!</Text>
                            <Text style={{ color: COLORS.textDim, fontSize: 18, textAlign: 'center', marginBottom: 10 }}>
                                You are playing as
                            </Text>
                            <Text style={{ fontSize: 32, fontWeight: 'bold', color: startModal.color === 'w' ? '#FFF' : '#AAA' }}>
                                {startModal.color === 'w' ? 'WHITE' : 'BLACK'}
                            </Text>
                        </View>
                    </View>
                </Modal>

                <GameOverModal
                    visible={showGameOver}
                    isWinner={isMyWin}
                    betAmount={betAmount}
                    winnerName={isMyWin ? 'You' : (opponent ? opponent.gamingName : 'Opponent')}
                    reason={gameOverReason}
                />

                {/* SURRENDER MODAL */}
                <Modal transparent animationType="fade" visible={surrenderModalVisible}>
                    <View style={styles.modalOverlay}>
                        <View style={[styles.modalContent, { borderColor: COLORS.error }]}>
                            <Text style={[styles.modalTitle, { color: COLORS.error }]}>🏳️ Surrender?</Text>
                            <Text style={{ color: COLORS.textDim, textAlign: 'center', marginBottom: 20 }}>
                                Are you sure you want to quit? You will forfeit the match and lose your bet of <Text style={{ color: '#FFD700', fontWeight: 'bold' }}>{betAmount}</Text> coins.
                            </Text>

                            <TouchableOpacity
                                style={[styles.primaryBtn, { backgroundColor: COLORS.error }]}
                                onPress={() => {
                                    setSurrenderModalVisible(false);
                                    socketService.leaveMatch(roomCode);
                                    navigation.goBack();
                                }}
                            >
                                <Text style={styles.btnText}>Yes, Quit</Text>
                            </TouchableOpacity>

                            <TouchableOpacity onPress={() => setSurrenderModalVisible(false)} style={styles.cancelBtn}>
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>

                {/* RECONNECT MODAL */}
                <Modal transparent animationType="fade" visible={showReconnectModal}>
                    <View style={styles.modalOverlay}>
                        <View style={[styles.modalContent, { borderColor: COLORS.warning }]}>
                            <ActivityIndicator size="large" color={COLORS.warning} />
                            <Text style={[styles.modalTitle, { color: COLORS.warning, marginTop: 20 }]}>Opponent Disconnected</Text>
                            <Text style={{ color: COLORS.textDim, textAlign: 'center', marginBottom: 20 }}>
                                Waiting for opponent to reconnect...
                            </Text>
                            <Text style={{ fontSize: 40, fontWeight: 'bold', color: COLORS.text }}>{reconnectTimer}s</Text>
                            <Text style={{ color: COLORS.textDim, marginTop: 10 }}>You will win automatically if they don't return.</Text>
                        </View>
                    </View>
                </Modal>

            </View >
        </AppBackground >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 50,
        paddingHorizontal: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
        height: 50,
    },
    title: {
        color: COLORS.text,
        fontSize: 18,
        fontWeight: 'bold',
    },
    statusText: {
        color: COLORS.error,
        fontWeight: 'bold',
        fontSize: 14,
    },
    iconBtn: {
        padding: 10,
        backgroundColor: COLORS.glass,
        borderRadius: 10,
    },
    gameArea: {
        flex: 1,
        justifyContent: 'center', // Vertically center the board
        paddingBottom: 50,
    },
    boardContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOWS.medium,
        marginVertical: 20,
    },
    playerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
        padding: 10,
        borderRadius: 15,
        alignSelf: 'flex-start',
        minWidth: 150,
        width: '100%',
    },
    playerTextContainer: {
        marginLeft: 10,
        flex: 1,
    },
    playerName: {
        color: COLORS.text,
        fontSize: 16,
        fontWeight: 'bold',
    },
    playerLevel: {
        color: COLORS.textDim,
        fontSize: 12,
    },
    // Modal Styles
    modalOverlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center', alignItems: 'center'
    },
    modalContent: {
        width: '85%', backgroundColor: COLORS.bgDark2,
        borderRadius: 25, padding: 30, alignItems: 'center',
        borderWidth: 1, borderColor: COLORS.glassBorder
    },
    closeBtn: {
        position: 'absolute', top: 15, right: 15,
    },
    modalName: {
        fontSize: 24, fontWeight: 'bold', color: COLORS.text, marginTop: 15
    },
    modalLevel: {
        fontSize: 14, color: COLORS.textDim, marginBottom: 25
    },
    statsGrid: {
        flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', width: '100%'
    },
    statItem: {
        width: '48%', backgroundColor: 'rgba(255,255,255,0.05)',
        padding: 15, borderRadius: 15, alignItems: 'center', marginBottom: 15
    },
    statValue: {
        color: COLORS.text, fontSize: 20, fontWeight: 'bold', marginVertical: 5
    },
    statLabel: {
        color: COLORS.textDim, fontSize: 12
    },
    avatarCount: {
        marginTop: 10, padding: 10, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10, width: '100%', alignItems: 'center'
    },
    // New Styles for Quit Modal
    modalTitle: { fontSize: 22, fontWeight: 'bold', color: COLORS.text, marginBottom: 20 },
    primaryBtn: { width: '100%', backgroundColor: COLORS.primary, padding: 15, borderRadius: 12, alignItems: 'center', marginBottom: 10 },
    btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
    cancelBtn: { padding: 10 },
    cancelText: { color: COLORS.textDim },

    // Add Friend Btn
    addFriendBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: COLORS.accent, paddingVertical: 12, paddingHorizontal: 20,
        borderRadius: 25, marginTop: 20, width: '100%'
    },
    addFriendText: {
        color: '#000', fontWeight: 'bold', fontSize: 16
    }
});
