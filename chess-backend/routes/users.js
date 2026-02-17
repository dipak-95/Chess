const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');

router.get('/profile', auth, userController.getProfile);
router.put('/avatar', auth, userController.updateAvatar);
router.get('/connections', auth, userController.getConnections);
router.post('/buy-avatar', auth, userController.buyAvatar);
router.post('/request', auth, userController.sendRequest);
router.put('/request/handle', auth, userController.handleRequest);
router.post('/spin', auth, userController.spinWheel);
router.post('/coins', auth, userController.addCoins);

module.exports = router;
