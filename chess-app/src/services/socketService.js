import io from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Replace with your actual IP address for local testing
const SOCKET_URL = 'https://pearlgems.store';

class SocketService {
    socket = null;

    connect() {
        if (this.socket) return;

        this.socket = io(SOCKET_URL, {
            transports: ['websocket'],
            forceNew: true,
        });

        this.socket.on('connect', async () => {
            console.log('Socket Connected:', this.socket.id);
            const userData = await AsyncStorage.getItem('user');
            if (userData) {
                const user = JSON.parse(userData);
                this.registerUser(user._id);
            }
        });

        this.socket.on('disconnect', () => {
            console.log('Socket Disconnected');
        });
    }

    registerUser(userId) {
        if (this.socket) this.socket.emit('register_user', userId);
    }

    joinRoom(roomId, user, betAmount = 0) {
        if (this.socket) this.socket.emit('join_room', { roomId, user, betAmount });
    }

    makeMove(roomId, move, fen) {
        if (this.socket) this.socket.emit('make_move', { roomId, move, fen });
    }

    sendIdentity(roomId, user) {
        if (this.socket) this.socket.emit('send_identity', { roomId, user });
    }

    sendChallenge(fromUser, toUserId, amount, roomCode) {
        if (this.socket) {
            this.socket.emit('send_challenge', { fromUser, toUserId, amount, roomCode });
        }
    }

    acceptChallenge(invitation) {
        if (this.socket) this.socket.emit('accept_challenge', { roomCode: invitation.roomCode });
    }

    rejectChallenge(invitation, myName) {
        if (this.socket) {
            this.socket.emit('reject_challenge', {
                targetUserId: invitation.fromUser._id,
                roomCode: invitation.roomCode,
                rejectorName: myName
            });
        }
    }

    leaveMatch(roomId) {
        if (this.socket) this.socket.emit('leave_match', { roomId });
    }

    on(event, callback) {
        if (this.socket) this.socket.on(event, callback);
    }

    off(event) {
        if (this.socket) this.socket.off(event);
    }

    findMatch(tableId, user, betAmount) {
        if (this.socket) this.socket.emit('find_match', { tableId, user, betAmount });
    }

    cancelSearch(tableId) {
        if (this.socket) this.socket.emit('cancel_search', { tableId });
    }

    sendFriendRequest(fromUser, toUserId) {
        if (this.socket) this.socket.emit('send_friend_request', { fromUser, toUserId });
    }

    rejoinGame(userId) {
        if (this.socket) this.socket.emit('rejoin_game', { userId });
    }
}

export default new SocketService();
