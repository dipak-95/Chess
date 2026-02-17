const express = require('express');
const router = express.Router();
const User = require('../models/User');
const DailyChallenge = require('../models/DailyChallenge');
const auth = require('../middleware/auth');

// Helper to get today's date string (YYYY-MM-DD)
const getTodayDate = () => new Date().toISOString().split('T')[0];

// @route   GET /api/daily-challenge/leaderboard
// @desc    Get top 10 players for today + user's rank
// @access  Private
router.get('/leaderboard', auth, async (req, res) => {
    try {
        const today = getTodayDate();

        // Find all submissions for today, sorted by time (asc)
        const allSubmissions = await DailyChallenge.find({ date: today })
            .sort({ timeTaken: 1 })
            .select('userId userName avatarId timeTaken');

        // Top 10
        const top10 = allSubmissions.slice(0, 10);

        // Find current user's rank
        const mySubmissionIndex = allSubmissions.findIndex(s => s.userId.toString() === req.user.id);

        let myRank = null;
        let myResult = null;

        if (mySubmissionIndex !== -1) {
            myRank = mySubmissionIndex + 1;
            myResult = allSubmissions[mySubmissionIndex];
        }

        res.json({
            top10,
            myRank,
            myResult,
            totalParticipants: allSubmissions.length
        });

    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/daily-challenge/start
// @desc    Pay entry fee (100 coins)
// @access  Private
router.post('/start', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ msg: 'User not found' });

        const ENTRY_FEE = 100;

        // Check if already completed today
        const today = getTodayDate();
        const existing = await DailyChallenge.findOne({ userId: req.user.id, date: today });
        if (existing) {
            return res.status(400).json({ msg: 'You have already completed today\'s challenge!' });
        }

        if (user.coins < ENTRY_FEE) {
            return res.status(400).json({ msg: 'Insufficient coins! Need 100 coins.' });
        }

        // Deduct Coins
        user.coins -= ENTRY_FEE;
        await user.save();

        res.json({ msg: 'Entry fee paid', coins: user.coins });

    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/daily-challenge/submit
// @desc    Submit result (Success only)
// @access  Private
router.post('/submit', auth, async (req, res) => {
    try {
        const { timeTaken } = req.body; // In seconds

        if (!timeTaken) return res.status(400).json({ msg: 'Time required' });

        const user = await User.findById(req.user.id);
        const today = getTodayDate();

        // Check if already exists
        let entry = await DailyChallenge.findOne({ userId: req.user.id, date: today });

        if (entry) {
            // If exists, we don't update (First success counts to prevent grinding)
            return res.status(400).json({ msg: 'Already submitted for today' });
        }

        // Create new entry
        entry = new DailyChallenge({
            userId: user._id,
            userName: user.gamingName || 'Anonymous',
            avatarId: user.avatarId || 'avatar_01',
            date: today,
            timeTaken: Number(timeTaken)
        });

        await entry.save();

        // Check for Reward (Participation) - User gets basic XP or something?
        // For now, reward is only for Top 10 at end of day.
        // But maybe give small XP?
        user.xp = (user.xp || 0) + 50; // 50 XP for solving
        await user.save();

        res.json({ msg: 'Score submitted', rank: 'Calculated in Leaderboard' });

    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/daily-challenge/distribute-prizes
// @desc    Give 1000 coins to top 10 (To be called by Cron Job at midnight)
// @access  Private (Should be Admin only, but simplified for now)
router.post('/distribute-prizes', async (req, res) => {
    try {
        const today = getTodayDate();

        // Find top 10 for today
        const winners = await DailyChallenge.find({ date: today })
            .sort({ timeTaken: 1 })
            .limit(10);

        for (let winner of winners) {
            const user = await User.findById(winner.userId);
            if (user) {
                user.coins = (user.coins || 0) + 1000;
                // Add a notification or log here if needed
                await user.save();
            }
        }

        res.json({ msg: `Prizes distributed to ${winners.length} players`, winners: winners.map(w => w.userName) });

    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
