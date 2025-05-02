const express = require('express');
const {register, verifyOTP, login, logout, getUser, forgotPassword, resetPassword} = require('../controllers/userController');
const isAuthenticated = require('../middlewares/auth.js');

const router = express.Router();

router.post('/register', register);
router.post('/otp-verification', verifyOTP);
router.post('/login', login);
router.get('/logout', isAuthenticated, logout);
router.get('/user', isAuthenticated, getUser);
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:token', resetPassword);

module.exports = router;
