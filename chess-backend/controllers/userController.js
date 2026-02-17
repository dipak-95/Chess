const User = require('../models/User');

exports.getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch (err) {
        res.status(500).send('Server Error');
    }
};

exports.updateAvatar = async (req, res) => {
    try {
        const { avatarId } = req.body;

        let user = await User.findById(req.user.id);

        // Simple logic: If avatar is "default_*", it's free. If "premium_*", check coins (future)
        user.avatarId = avatarId;
        await user.save();

        res.json(user);
    } catch (err) {
        res.status(500).send('Server Error');
    }
};

exports.getConnections = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).populate('connections.userId', 'gamingName avatarId stats coins');

        const connections = user.connections.filter(c => c.status === 'accepted');
        const pending = user.connections.filter(c => c.status === 'pending'); // Pending received requests

        res.json({ connections, pending });
    } catch (err) {
        res.status(500).send('Server Error');
    }
};

exports.sendRequest = async (req, res) => {
    try {
        const { targetGamingName } = req.body;
        const target = await User.findOne({ gamingName: targetGamingName });

        if (!target) return res.status(404).json({ msg: 'User not found' });
        if (target._id.toString() === req.user.id) return res.status(400).json({ msg: 'Cannot add yourself' });

        const user = await User.findById(req.user.id);

        // Check if already exists
        const exists = user.connections.find(c => c.userId.toString() === target._id.toString());
        if (exists) return res.status(400).json({ msg: 'Request already sent or connected' });

        // Add to Target (as pending received)
        target.connections.push({ userId: req.user.id, status: 'pending' });
        await target.save();

        // Add to Sender (as waiting... actually we defined 'pending' as received. Let's use 'sent')
        user.connections.push({ userId: target._id, status: 'sent' });
        await user.save();

        res.json({ msg: 'Request Sent' });
    } catch (err) {
        console.log(err);
        res.status(500).send('Server Error');
    }
};

exports.buyAvatar = async (req, res) => {
    try {
        const { avatarId, cost } = req.body;
        const user = await User.findById(req.user.id);

        if (user.unlockedAvatars.includes(avatarId)) {
            return res.status(400).json({ msg: 'Avatar already owned' });
        }

        if (user.coins < cost) {
            return res.status(400).json({ msg: 'Insufficient coins' });
        }

        // Deduct coins and unlock
        user.coins -= cost;
        user.unlockedAvatars.push(avatarId);

        // Auto-equip? Optional. Let's not auto-equip.
        // user.avatarId = avatarId; 

        await user.save();
        res.json(user);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

exports.handleRequest = async (req, res) => {
    try {
        const { targetUserId, action } = req.body;
        const user = await User.findById(req.user.id);
        const target = await User.findById(targetUserId);

        if (!target) return res.status(404).json({ msg: 'User not found' });

        if (action === 'accept') {
            // Update User (Recipient)
            const connIndex = user.connections.findIndex(c => c.userId.toString() === targetUserId);
            if (connIndex > -1) user.connections[connIndex].status = 'accepted';

            // Update Target (Sender)
            const targetConnIndex = target.connections.findIndex(c => c.userId.toString() === req.user.id);
            if (targetConnIndex > -1) target.connections[targetConnIndex].status = 'accepted';

            await user.save();
            await target.save();
            res.json(user.connections);
        } else {
            // Reject - Remove both
            user.connections = user.connections.filter(c => c.userId.toString() !== targetUserId);
            target.connections = target.connections.filter(c => c.userId.toString() !== req.user.id);

            await user.save();
            await target.save();
            res.json(user.connections);
        }
    } catch (err) {
        console.log(err);
        res.status(500).send('Server Error');
    }
};
exports.spinWheel = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        // REWARDS with Updated Probabilities (Total = 1.0)
        // Must match Frontend order!
        const rewards = [
            { id: 0, amount: 250, label: '250', probability: 0.20 },
            { id: 1, amount: 10, label: '10', probability: 0.15 },
            { id: 2, amount: 5000, label: '5k', probability: 0.05 },
            { id: 3, amount: 10000, label: '10k', probability: 0.01 }, // Jackpot
            { id: 4, amount: 500, label: '500', probability: 0.10 },
            { id: 5, amount: 100, label: '100', probability: 0.15 },
            { id: 6, amount: 50, label: '50', probability: 0.15 },
            { id: 7, amount: 1000, label: '1k', probability: 0.04 },
            { id: 8, amount: 20, label: '20', probability: 0.10 },
            { id: 9, amount: 0, label: '0', probability: 0.05 }
        ];

        const random = Math.random();
        let cumulativeProbability = 0;
        let selectedReward = rewards[rewards.length - 1];

        for (const reward of rewards) {
            cumulativeProbability += reward.probability;
            if (random < cumulativeProbability) {
                selectedReward = reward;
                break;
            }
        }

        user.coins += selectedReward.amount;
        await user.save();

        res.json({
            index: selectedReward.id,
            amount: selectedReward.amount,
            coins: user.coins
        });

    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

exports.addCoins = async (req, res) => {
    try {
        const { amount } = req.body;
        const user = await User.findById(req.user.id);

        user.coins += amount;
        await user.save();

        res.json({ newBalance: user.coins });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};
