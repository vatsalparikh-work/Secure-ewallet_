const express = require('express');
const { body } = require('express-validator');
const { register, login, logout, verifyOTP, forgotPassword, verifyResetOTP, resetPassword } = require('../controllers/authController');
const { redirectIfLoggedIn } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/register', [
    body('name').notEmpty().withMessage('Name is required').trim().escape(),
    body('email').isEmail().withMessage('Must be a valid email').normalizeEmail(),
    body('phone').notEmpty().withMessage('Phone number is required').trim().escape(),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], register);

router.post('/login', login);
router.post('/verify-otp', verifyOTP);
router.get('/logout', logout);

router.post('/forgot-password', forgotPassword);
router.post('/verify-reset-otp', verifyResetOTP);
router.post('/reset-password', resetPassword);

// GET routes to render EJS forms
router.get('/login', redirectIfLoggedIn, (req, res) => {
    const showCaptcha = req.session.showCaptcha || false;
    const attemptEmail = req.session.attemptEmail || '';
    res.render('auth/login', {
        title: 'Login',
        showCaptcha,
        attemptEmail,
        recaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY
    });
});

router.get('/register', redirectIfLoggedIn, (req, res) => {
    res.render('auth/register', { title: 'Register' });
});

router.get('/verify-otp', (req, res) => {
    if (!req.session.verifyEmail) {
        return res.redirect('/auth/login');
    }
    res.render('auth/verify-otp', { title: 'Verify OTP', email: req.session.verifyEmail });
});

router.get('/forgot-password', redirectIfLoggedIn, (req, res) => {
    res.render('auth/forgot-password', { title: 'Forgot Password' });
});

router.get('/verify-reset-otp', redirectIfLoggedIn, (req, res) => {
    if (!req.session.resetEmail) {
        return res.redirect('/auth/forgot-password');
    }
    // Only allow access if they haven't verified yet
    if (req.session.otpVerified) {
        return res.redirect('/auth/reset-password');
    }
    res.render('auth/verify-reset-otp', { title: 'Verify Reset OTP', email: req.session.resetEmail });
});

router.get('/reset-password', redirectIfLoggedIn, (req, res) => {
    if (!req.session.resetEmail || !req.session.otpVerified) {
        return res.redirect('/auth/forgot-password');
    }
    res.render('auth/reset-password', { title: 'Reset Password' });
});

module.exports = router;
