const express = require('express');
const router  = express.Router();
const { register, login, getMe, forgotPassword, updateProfile, changePassword, verifyEmail, resendCode } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register',        register);
router.post('/login',           login);
router.get('/me',  protect,     getMe);
router.post('/verify-email',    verifyEmail);
router.post('/resend-code',     resendCode);
router.post('/forgot-password', forgotPassword);
router.put('/profile',          protect, updateProfile);
router.put('/change-password',  protect, changePassword);

module.exports = router;