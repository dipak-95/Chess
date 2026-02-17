const mongoose = require('mongoose');

const DailyChallengeSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String, required: true },
    avatarId: { type: String, default: 'avatar_01' },
    date: { type: String, required: true }, // Format: "YYYY-MM-DD" to group by day
    timeTaken: { type: Number, required: true }, // In seconds
    createdAt: { type: Date, default: Date.now }
});

// Compound index to ensure one attempt per user per day (optional, but good for data integrity)
// If we want to allow multiple attempts with entry fee, we can remove unique: true or handle logic in controller.
// The user said "Entry fee 100", implies they can try again? 
// Usually daily challenges are "one shot" or "pay to retry".
// Let's assume Pay to Play (multiple attempts allowed, best time kept? Or just pay per attempt?)
// "Entry fee 100" -> "Top 10 win 1000". It sounds like a tournament. 
// I will allow multiple entries, but only the BEST time counts for the leaderboard.
DailyChallengeSchema.index({ userId: 1, date: 1 });

module.exports = mongoose.model('DailyChallenge', DailyChallengeSchema);
