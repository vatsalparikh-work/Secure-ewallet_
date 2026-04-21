const { User, OTP, Log } = require('../models');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { sendTokenResponse } = require('../middlewares/authMiddleware');
const sendEmail = require('../utils/sendEmail');
const { validationResult } = require('express-validator');

// @desc    Register user
// @route   POST /auth/register
exports.register = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            req.flash('error_msg', errors.array().map(e => e.msg).join(', '));
            return res.redirect('/auth/register');
        }

        const { name, email, phone, password } = req.body;

        // Check unique fields
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            req.flash('error_msg', 'Email is already registered.');
            return res.redirect('/auth/register');
        }

        const existingPhone = await User.findOne({ where: { phone } });
        if (existingPhone) {
            req.flash('error_msg', 'Phone number is already registered.');
            return res.redirect('/auth/register');
        }

        // Hash Password - 12 rounds
        const salt = await bcrypt.genSalt(12);
        const password_hash = await bcrypt.hash(password, salt);

        // Create User
        const user = User.build({
            name,
            email,
            phone,
            password_hash,
            wallet_balance: 0.00,
            is_verified: false
        });
        user.balance_hash = user.generateBalanceHash(0.00);
        await user.save();

        // Generate OTP
        const otpValue = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit OTP
        const expires_at = new Date(Date.now() + 10 * 60 * 1000); // 10 mins expiry

        await OTP.create({
            user_id: user.id,
            otp: otpValue,
            expires_at
        });

        // Send OTP Simulation
        await sendEmail({
            email: user.email,
            subject: 'Your eWallet OTP',
            message: `Your One-Time Password is: ${otpValue}. It will expire in 10 minutes.`
        });

        // Redirect to OTP verification step
        req.session.verifyEmail = email; // store in session to use on next screen
        req.flash('success_msg', 'Registered successfully! Please verify your email via the OTP sent.');
        res.redirect('/auth/verify-otp');
    } catch (err) {
        next(err);
    }
};

// @desc    Verify OTP
// @route   POST /auth/verify-otp
exports.verifyOTP = async (req, res, next) => {
    try {
        const { email, otp } = req.body;

        const user = await User.findOne({ where: { email } });
        if (!user) {
            req.flash('error_msg', 'User not found.');
            return res.redirect('/auth/verify-otp');
        }

        if (user.is_verified) {
            req.flash('success_msg', 'Email is already verified. You can log in.');
            return res.redirect('/auth/login');
        }

        const validOTP = await OTP.findOne({
            where: { user_id: user.id, otp }
        });

        if (!validOTP) {
            req.flash('error_msg', 'Invalid OTP.');
            return res.redirect('/auth/verify-otp');
        }

        if (new Date() > validOTP.expires_at) {
            req.flash('error_msg', 'OTP has expired.');
            return res.redirect('/auth/verify-otp');
        }

        // OTP is valid
        user.is_verified = true;
        await user.save();

        // Remove OTP record
        await validOTP.destroy();

        // Optionally delete session var
        delete req.session.verifyEmail;

        req.flash('success_msg', 'Email verified successfully! You can now log in.');
        res.redirect('/auth/login');
    } catch (err) {
        next(err);
    }
};

// @desc    Login user
// @route   POST /auth/login
exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const recaptchaResponse = req.body['g-recaptcha-response'];

        if (!email || !password) {
            req.flash('error_msg', 'Please provide an email and password.');
            return res.redirect('/auth/login');
        }

        // Check user
        const user = await User.findOne({ where: { email } });

        if (!user) {
            req.flash('error_msg', 'Invalid credentials.');
            return res.redirect('/auth/login');
        }

        if (!user.is_verified) {
            req.session.verifyEmail = email;
            req.flash('error_msg', 'Please verify your email first.');
            return res.redirect('/auth/verify-otp');
        }

        // Check if under brute force protection (>= 3 attempts)
        // Check if under brute force protection (>= 3 attempts)
        const MAX_ATTEMPTS = 3;

        if (user.login_attempts >= MAX_ATTEMPTS) {
            if (!recaptchaResponse) {
                // Return them to login with a flag to show the captcha
                req.session.showCaptcha = true;
                req.session.attemptEmail = email; // Pre-fill their email
                req.flash('error_msg', 'Too many failed login attempts. Please complete the CAPTCHA.');
                return req.session.save(() => {
                    res.redirect('/auth/login');
                });
            }

            // Verify the reCAPTCHA token with Google
            const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${recaptchaResponse}`;
            try {
                // Assuming you have node-fetch or native fetch in Node 18+
                const response = await fetch(verifyUrl, { method: 'POST' });
                const body = await response.json();

                if (!body.success) {
                    req.session.showCaptcha = true;
                    req.session.attemptEmail = email;
                    req.flash('error_msg', 'Invalid CAPTCHA challenge. Please try again.');
                    return res.redirect('/auth/login');
                }
            } catch (err) {
                console.error("reCAPTCHA Verification Error:", err);
                req.flash('error_msg', 'Could not verify CAPTCHA. Please try again later.');
                return res.redirect('/auth/login');
            }
        }

        // Check password matching
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            // Increment failed attempts
            user.login_attempts += 1;
            await user.save();

            req.flash('error_msg', 'Invalid credentials.');

            // If they just hit the threshold, immediately show the captcha next time
            if (user.login_attempts >= MAX_ATTEMPTS) {
                req.session.showCaptcha = true;
                req.session.attemptEmail = email;
            } else {
                req.session.showCaptcha = false;
            }

            return req.session.save(() => {
                res.redirect('/auth/login');
            });
        }

        // Success: Reset login attempts
        if (user.login_attempts > 0) {
            user.login_attempts = 0;
            await user.save();
        }

        // Clean session vars
        delete req.session.showCaptcha;
        delete req.session.attemptEmail;

        // Log the successful login
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        await Log.create({
            user_id: user.id,
            action: 'LOGIN',
            ip_address: ip
        });

        // Set token in cookie and redirect
        sendTokenResponse(user, 200, res, '/dashboard');
    } catch (err) {
        next(err);
    }
};

// @desc    Logout user
// @route   GET /auth/logout
exports.logout = (req, res, next) => {
    try {
        res.cookie('jwt', 'none', {
            expires: new Date(Date.now() + 10 * 1000),
            httpOnly: true
        });

        req.flash('success_msg', 'You have successfully logged out.');
        res.redirect('/auth/login');
    } catch (err) {
        next(err);
    }
};

// @desc    Forgot Password Request
// @route   POST /auth/forgot-password
exports.forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ where: { email } });

        if (!user) {
            req.flash('error_msg', 'If that email is registered, an OTP has been sent.');
            return res.redirect('/auth/forgot-password');
        }

        // Generate OTP
        const otpValue = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit OTP
        const expires_at = new Date(Date.now() + 10 * 60 * 1000); // 10 mins expiry

        // Invalidate old OTPs for password reset (optional but good practice)
        await OTP.destroy({ where: { user_id: user.id } });

        await OTP.create({
            user_id: user.id,
            otp: otpValue,
            expires_at
        });

        // Send OTP Simulation
        await sendEmail({
            email: user.email,
            subject: 'Password Reset OTP',
            message: `Your password reset One-Time Password is: ${otpValue}. It will expire in 10 minutes.`
        });

        req.session.resetEmail = email;
        req.session.otpVerified = false; // Add verify tracking flag
        req.flash('success_msg', 'An OTP has been sent to your email address.');
        res.redirect('/auth/verify-reset-otp');
    } catch (err) {
        next(err);
    }
}

// @desc    Verify Reset Password OTP
// @route   POST /auth/verify-reset-otp
exports.verifyResetOTP = async (req, res, next) => {
    try {
        const { otp } = req.body;
        const email = req.session.resetEmail;

        if (!email) {
            req.flash('error_msg', 'Session expired. Please request a new OTP.');
            return res.redirect('/auth/forgot-password');
        }

        const user = await User.findOne({ where: { email } });
        if (!user) {
            req.flash('error_msg', 'User not found.');
            return res.redirect('/auth/forgot-password');
        }

        const validOTP = await OTP.findOne({
            where: { user_id: user.id, otp }
        });

        if (!validOTP) {
            req.flash('error_msg', 'Invalid OTP.');
            return res.redirect('/auth/verify-reset-otp');
        }

        if (new Date() > validOTP.expires_at) {
            req.flash('error_msg', 'OTP has expired. Please request a new one.');
            return res.redirect('/auth/forgot-password');
        }

        // OTP is valid
        req.session.otpVerified = true;

        // Remove OTP record early so it can't be reused later maliciously
        await validOTP.destroy();

        req.flash('success_msg', 'OTP verified. Please enter your new password.');
        res.redirect('/auth/reset-password');

    } catch (err) {
        next(err);
    }
};

// @desc    Reset Password
// @route   POST /auth/reset-password
exports.resetPassword = async (req, res, next) => {
    try {
        const { newPassword, confirmPassword } = req.body;
        const email = req.session.resetEmail;
        const isVerified = req.session.otpVerified;

        if (!email || !isVerified) {
            req.flash('error_msg', 'Unauthorized. Please verify your OTP first.');
            return res.redirect('/auth/forgot-password');
        }

        if (newPassword !== confirmPassword) {
            req.flash('error_msg', 'Passwords do not match.');
            return res.redirect('/auth/reset-password');
        }

        if (newPassword.length < 6) {
            req.flash('error_msg', 'Password must be at least 6 characters long.');
            return res.redirect('/auth/reset-password');
        }

        const user = await User.findOne({ where: { email } });
        if (!user) {
            req.flash('error_msg', 'User not found.');
            return res.redirect('/auth/forgot-password');
        }

        // Proceed to reset password
        const salt = await bcrypt.genSalt(12);
        user.password_hash = await bcrypt.hash(newPassword, salt);
        await user.save();

        // Safe cleanup
        delete req.session.resetEmail;
        delete req.session.otpVerified;

        req.flash('success_msg', 'Password reset successfully! You can now log in.');
        res.redirect('/auth/login');
    } catch (err) {
        next(err);
    }
}
