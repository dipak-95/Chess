const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Signup
exports.signup = async (req, res) => {
    try {
        const { gamingName, email, password } = req.body;

        // Validation
        if (!gamingName || !email || !password) {
            return res.status(400).json({ msg: 'Please enter all fields' });
        }

        // Check for existing user
        const existingUser = await User.findOne({
            $or: [{ email }, { gamingName }]
        });

        if (existingUser) {
            return res.status(400).json({ msg: 'User with this email or gaming name already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const newUser = new User({
            gamingName,
            email,
            password: passwordHash,
            coins: 500, // Ensure starting coins
            unlockedAvatars: ['avatar_01', 'avatar_02', 'avatar_03'],
            avatarId: 'avatar_01'
        });

        const savedUser = await newUser.save();

        const token = jwt.sign({ id: savedUser._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.json({
            token,
            user: {
                _id: savedUser._id, // IMPORTANT: Frontend expects _id
                gamingName: savedUser.gamingName,
                email: savedUser.email,
                coins: savedUser.coins,
                avatarId: savedUser.avatarId,
                level: savedUser.level,
                unlockedAvatars: savedUser.unlockedAvatars
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

// Login
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ msg: 'Please enter all fields' });
        }

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ msg: 'User does not exist' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ msg: 'Invalid credentials' });

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.json({
            token,
            user: {
                _id: user._id, // Consistently use _id
                gamingName: user.gamingName,
                email: user.email,
                coins: user.coins,
                avatarId: user.avatarId
            }
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
