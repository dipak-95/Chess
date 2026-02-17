const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    gamingName: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        index: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String, // Will be hashed
        required: true
    },
    avatarId: {
        type: String,
        default: 'default_1'
    },
    unlockedAvatars: {
        type: [String],
        default: ['avatar_01', 'avatar_02', 'avatar_03']
    },
    coins: {
        type: Number,
        default: 500 // Start with 500 coins
    },
    stats: {
        wins: { type: Number, default: 0 },
        losses: { type: Number, default: 0 },
        draws: { type: Number, default: 0 },
        totalGames: { type: Number, default: 0 }
    },
    level: {
        type: Number,
        default: 1
    },
    xp: {
        type: Number,
        default: 0
    },
    matchHistory: [{
        opponentName: String,
        result: { type: String, enum: ['Win', 'Loss', 'Draw'] },
        amount: Number,
        date: { type: Date, default: Date.now }
    }],
    connections: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        status: { type: String, enum: ['pending', 'accepted', 'sent'], default: 'pending' }
    }],
    lastSpin: {
        type: Date,
        default: null
    }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
