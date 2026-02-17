require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*', // Allow all for now, restrict in production
        methods: ['GET', 'POST']
    }
});

// Middleware
app.use(cors());
app.use(express.json());

// Database Connection
const uri = process.env.MONGODB_URI;
console.log('Connecting to MongoDB...', uri ? 'URI Provided' : 'URI Missing');

mongoose.connect(uri)
    .then(() => console.log('MongoDB Connected'))
    .catch(err => {
        console.error('MongoDB Connection Error:', err);
    });

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));

app.get('/', (req, res) => {
    res.send('Chess App Backend Running');
});

// 40. Waiting Queues for Random Matchmaking
// Socket.IO Logic
const onlineUsers = new Map(); // userId -> socketId
const rooms = new Map(); // roomId -> { players: [], betAmount: 0 }
const waitingQueues = new Map(); // tableId -> { socketId, user }

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // 1. Register User
    socket.on('register_user', (userId) => {
        onlineUsers.set(userId, socket.id);
        console.log(`User registered: ${userId} -> ${socket.id}`);
    });

    // 1.5 Check Online Status
    socket.on('check_online_status', (userIds) => {
        const statuses = userIds.map(id => ({
            userId: id,
            isOnline: onlineUsers.has(id)
        }));
        socket.emit('online_status_result', statuses);
    });

    // 2. Random Matchmaking Logic ("Find Match")
    socket.on('find_match', ({ tableId, user, betAmount }) => {
        console.log(`User ${user.gamingName} looking for match in ${tableId} (Bet: ${betAmount})`);

        // Check if someone is already waiting in this table's queue
        if (waitingQueues.has(tableId)) {
            const opponent = waitingQueues.get(tableId);

            // Prevent matching with self (rare race condition)
            if (opponent.user._id === user._id) return;

            // --- FOUND MATCH ---
            waitingQueues.delete(tableId); // Remove from queue

            const roomId = `match_${tableId}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
            const socket1 = io.sockets.sockets.get(opponent.socketId);
            const socket2 = socket;

            if (socket1 && socket2) {
                // Join both to unique room
                socket1.join(roomId);
                socket2.join(roomId);

                // Create Room Data
                rooms.set(roomId, {
                    players: [
                        { socketId: opponent.socketId, user: opponent.user },
                        { socketId: socket.id, user }
                    ],
                    betAmount: Number(betAmount)
                });

                // Assign Colors (Opponent waiting is White, Challenger is Black)
                console.log(`Match Found! ${opponent.user.gamingName} vs ${user.gamingName} in ${roomId}`);

                io.to(roomId).emit('game_start', {
                    white: opponent.user,
                    black: user,
                    roomId,
                    betAmount,
                    players: [opponent.user, user] // Send full details for UI
                });
            } else {
                // If waiting socket disconnected, put current user in queue instead
                waitingQueues.set(tableId, { socketId: socket.id, user });
                socket.emit('waiting_for_opponent');
            }

        } else {
            // --- NO MATCH FOUND, ADD TO QUEUE ---
            waitingQueues.set(tableId, { socketId: socket.id, user });
            socket.emit('waiting_for_opponent');
            console.log(`${user.gamingName} added to queue for ${tableId}`);
        }
    });

    // 2.5 Friend Request
    socket.on('send_friend_request', ({ fromUser, toUserId }) => {
        const targetSocketId = onlineUsers.get(toUserId);
        if (targetSocketId) {
            io.to(targetSocketId).emit('friend_request_received', { fromUser });
        }
    });

    socket.on('accept_friend_request', ({ fromUser, toUserId }) => {
        const targetSocketId = onlineUsers.get(toUserId);
        if (targetSocketId) {
            // Logic to update DB typically happens via API, here we just notify live
            io.to(targetSocketId).emit('friend_request_accepted', { fromUser });
        }
    });

    // 2.9 Cancel Search
    socket.on('cancel_search', ({ tableId }) => {
        if (waitingQueues.has(tableId)) {
            const waiting = waitingQueues.get(tableId);
            if (waiting.socketId === socket.id) {
                waitingQueues.delete(tableId);
                console.log(`User cancelled search in ${tableId}`);
            }
        }
    });

    // 3. Game Logic (Move)
    socket.on('make_move', (data) => {
        socket.to(data.roomId).emit('receive_move', data);
    });

    // 4. Win/Loss Logic (Client triggers for Checkmate)
    socket.on('game_over', async ({ roomId, winnerId }) => {
        if (!rooms.has(roomId)) return;
        const room = rooms.get(roomId);
        const bet = room.betAmount;

        // Find winner and loser
        const winner = room.players.find(p => p.user._id === winnerId);
        const loser = room.players.find(p => p.user._id !== winnerId);

        if (winner && loser) {
            await handleGameEnd(winner.user, loser.user, bet);
        }
    });

    // 5. Challenge Logic (Direct Play)
    socket.on('send_challenge', ({ fromUser, toUserId, amount, roomCode }) => {
        const targetSocketId = onlineUsers.get(toUserId);
        if (targetSocketId) {
            io.to(targetSocketId).emit('receive_challenge', {
                fromUser,
                amount,
                roomCode,
                challengeId: Math.random().toString(36).substr(2, 9)
            });
            console.log(`Challenge sent from ${fromUser.gamingName} to ${toUserId}`);
        }
    });

    socket.on('accept_challenge', ({ roomCode }) => {
        // Logic handled by existing 'join_room', kept for compatibility if needed
    });

    // 8. Join or Create Room (Manual Code)
    socket.on('join_room', ({ roomId, user, betAmount }) => {
        let room = rooms.get(roomId);

        if (!room) {
            // Create Room (Host)
            room = {
                players: [],
                betAmount: Number(betAmount) || 0
            };
            rooms.set(roomId, room);
        }

        // Check if user already in room (re-join logic handled elsewhere, but safety check)
        const existingPlayer = room.players.find(p => p.user._id === user._id);
        if (existingPlayer) {
            existingPlayer.socketId = socket.id; // Update socket
        } else {
            if (room.players.length >= 2) {
                socket.emit('room_full');
                return;
            }
            room.players.push({ socketId: socket.id, user });
        }

        socket.join(roomId);
        console.log(`${user.gamingName} joined room ${roomId}`);

        // Start Game if 2 players
        if (room.players.length === 2) {
            const [p1, p2] = room.players;
            io.to(roomId).emit('game_start', {
                white: p1.user, // First joiner (Host) is White
                black: p2.user, // Second joiner is Black
                roomId,
                betAmount: room.betAmount,
                players: [p1.user, p2.user]
            });
            console.log(`Game Started in ${roomId}: ${p1.user.gamingName} vs ${p2.user.gamingName}`);
        }
    });

    socket.on('reject_challenge', ({ targetUserId, rejectorName }) => {
        const targetSocketId = onlineUsers.get(targetUserId);
        if (targetSocketId) {
            io.to(targetSocketId).emit('challenge_rejected', { userName: rejectorName });
        }
    });

    // 6. Leave Match / Resign Logic
    socket.on('leave_match', async ({ roomId }) => {
        await handlePlayerExit(socket.id, roomId);
    });

    // 7. Rejoin Logic
    socket.on('rejoin_game', async ({ userId }) => {
        // Check if this user has a pending disconnect timer
        if (disconnectTimers.has(userId)) {
            const { roomId, timer } = disconnectTimers.get(userId);
            clearTimeout(timer);
            disconnectTimers.delete(userId);

            const room = rooms.get(roomId);
            if (room) {
                // Update player's socket ID
                const playerIndex = room.players.findIndex(p => p.user._id === userId);
                if (playerIndex !== -1) {
                    room.players[playerIndex].socketId = socket.id;
                    socket.join(roomId);

                    // Notify both
                    io.to(roomId).emit('opponent_rejoined', { userId });
                    console.log(`User ${userId} rejoined room ${roomId}`);

                    // Re-register in online map
                    onlineUsers.set(userId, socket.id);
                }
            }
        } else {
            // Try to find if user is in any active room (maybe app crash but socket stayed open briefly?)
            // For now, simple logic: if not in timer, assume fresh start or lost.
            onlineUsers.set(userId, socket.id);
        }
    });

    // Disconnect Handling
    const disconnectTimers = new Map(); // userId -> { roomId, timer }

    socket.on('disconnect', async () => {
        console.log('Disconnect:', socket.id);
        let userId = null;

        // 1. Find User ID
        for (const [uid, sid] of onlineUsers.entries()) {
            if (sid === socket.id) {
                userId = uid;
                onlineUsers.delete(uid); // Mark offline immediately
                break;
            }
        }

        // 2. Remove from Waiting Queues (Immediate removal)
        for (const [tableId, obj] of waitingQueues.entries()) {
            if (obj.socketId === socket.id) {
                waitingQueues.delete(tableId);
                console.log('Removed disconnected user from queue:', tableId);
            }
        }

        // 3. Handle Active Games (Grace Period)
        if (userId) {
            for (const [roomId, room] of rooms.entries()) {
                const isPlayer = room.players.find(p => p.user._id === userId);
                if (isPlayer) {
                    // Start Grace Period Timer (15 seconds)
                    console.log(`Starting disconnect timer for ${userId} in ${roomId}`);

                    // Notify opponent immediately
                    socket.to(roomId).emit('opponent_reconnecting', { timeLeft: 15 });

                    const timer = setTimeout(async () => {
                        console.log(`Timeout expired for ${userId}. Forfeiting match.`);
                        disconnectTimers.delete(userId);
                        await handlePlayerExit(null, roomId, userId); // Pass userId explicitly
                    }, 15000); // 15 Seconds

                    disconnectTimers.set(userId, { roomId, timer });
                    break; // User can only be in one room
                }
            }
        }
    });
});

// Updated Helper: handlePlayerExit
// Can be called by socket disconnect (socketId) OR by timeout (userId)
async function handlePlayerExit(socketId, specificRoomId = null, specificUserId = null) {
    for (const [roomId, room] of rooms.entries()) {
        if (specificRoomId && roomId !== specificRoomId) continue;

        let disconnectedPlayer = null;
        let remainingPlayer = null;

        if (specificUserId) {
            disconnectedPlayer = room.players.find(p => p.user._id === specificUserId);
            remainingPlayer = room.players.find(p => p.user._id !== specificUserId);
        } else if (socketId) {
            disconnectedPlayer = room.players.find(p => p.socketId === socketId);
            remainingPlayer = room.players.find(p => p.socketId !== socketId);
        }

        if (disconnectedPlayer && remainingPlayer) {
            console.log(`Player ${disconnectedPlayer.user.gamingName} left ${roomId}. Winner: ${remainingPlayer.user.gamingName}`);

            // Award Win
            await handleGameEnd(remainingPlayer.user, disconnectedPlayer.user, room.betAmount);

            // Notify Remaining Player
            if (remainingPlayer.socketId) {
                io.to(remainingPlayer.socketId).emit('opponent_disconnected', {
                    winner: remainingPlayer.user,
                    betAmount: room.betAmount,
                    reason: 'Opponent Disconnected'
                });
            }

            // Cleanup Room
            rooms.delete(roomId);
            return;
        }
    }
}

// Helper to update coins
// Helper to update coins, stats, xp, and history
async function handleGameEnd(winner, loser, amount) {
    // amount can be 0 (friendly match)
    const bet = Number(amount) || 0;

    try {
        const User = require('./models/User');

        // --- Calculate XP ---
        // Base Win XP: 100
        // Bet Bonus: 1 XP per 10 coins earned (Max 500 bonus)
        const baseXp = 100;
        const betBonus = Math.min(Math.floor(bet / 10), 500);
        const totalXpEarned = baseXp + betBonus;

        // --- Update Winner ---
        // We need to fetch first to check level up logic
        const winnerDoc = await User.findById(winner._id);
        if (winnerDoc) {
            let newXp = (winnerDoc.xp || 0) + totalXpEarned;
            let newLevel = winnerDoc.level || 1;

            // Level Up Threshold: Level * 500 (e.g., Lvl 1->2 needs 500xp, Lvl 2->3 needs 1000xp more)
            // Simplified: Threshold = newLevel * 500.
            let requiredXp = newLevel * 500;

            while (newXp >= requiredXp && newLevel < 999) {
                newXp -= requiredXp;
                newLevel++;
                requiredXp = newLevel * 500;
            }

            // Update Winner Fields
            winnerDoc.coins = (winnerDoc.coins || 0) + bet;
            winnerDoc.xp = newXp;
            winnerDoc.level = newLevel;
            winnerDoc.stats.wins = (winnerDoc.stats.wins || 0) + 1;
            winnerDoc.stats.totalGames = (winnerDoc.stats.totalGames || 0) + 1;

            // Add to History
            winnerDoc.matchHistory.push({
                opponentName: loser.gamingName,
                result: 'Win',
                amount: bet
            });
            // Keep last 10
            if (winnerDoc.matchHistory.length > 10) winnerDoc.matchHistory.shift();

            await winnerDoc.save();
        }

        // --- Update Loser ---
        const loserDoc = await User.findById(loser._id);
        if (loserDoc) {
            loserDoc.coins = Math.max((loserDoc.coins || 0) - bet, 0); // Prevent negative
            loserDoc.stats.losses = (loserDoc.stats.losses || 0) + 1;
            loserDoc.stats.totalGames = (loserDoc.stats.totalGames || 0) + 1;

            // Add to History
            loserDoc.matchHistory.push({
                opponentName: winner.gamingName,
                result: 'Loss',
                amount: bet
            });
            if (loserDoc.matchHistory.length > 10) loserDoc.matchHistory.shift();

            await loserDoc.save();
        }

        console.log(`Game End: ${winner.gamingName} won ${bet} coins & ${totalXpEarned} XP vs ${loser.gamingName}`);

    } catch (err) {
        console.error("DB Update Error:", err);
    }
}

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
