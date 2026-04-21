const jwt = require('jsonwebtoken');
const { User } = require('../models');

const protectUrl = async (req, res, next) => {
    let token;

    // Check for token in cookies
    if (req.cookies.jwt) {
        token = req.cookies.jwt;
    }

    if (!token) {
        req.flash('error_msg', 'Not authorized to access this route, please log in.');
        return res.redirect('/auth/login');
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Find user by ID
        const currentUser = await User.findByPk(decoded.id);

        if (!currentUser) {
            req.flash('error_msg', 'The user belonging to this token no longer exists.');
            res.clearCookie('jwt');
            return res.redirect('/auth/login');
        }

        // Grant access to protected route by attaching user to req
        req.user = currentUser;
        res.locals.user = currentUser; // Make available to views
        next();
    } catch (error) {
        console.error('JWT Verification Error:', error);
        req.flash('error_msg', 'Session expired or invalid token. Please log in again.');
        res.clearCookie('jwt');
        return res.redirect('/auth/login');
    }
};

const generateToken = (id) => {
    // 15 minutes expiry as required
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '15m'
    });
};

const sendTokenResponse = (user, statusCode, res, redirectUrl = '/dashboard') => {
    const token = generateToken(user.id);

    // Cookie options
    const options = {
        expires: new Date(Date.now() + 15 * 60 * 1000), // 15 mins
        httpOnly: true, // Prevent XSS access
        secure: process.env.NODE_ENV === 'production' // Send only over HTTPS in prod
    };

    res.status(statusCode)
        .cookie('jwt', token, options)
        .redirect(redirectUrl);
};

const adminOnly = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ success: false, message: 'Not authorized as an admin' });
    }
};

const redirectIfLoggedIn = async (req, res, next) => {
    let token = req.cookies.jwt;
    if (token && token !== 'none') {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const currentUser = await User.findByPk(decoded.id);
            if (currentUser) {
                return res.redirect('/dashboard');
            }
        } catch (error) {
            // invalid token, proceed to login page
        }
    }
    next();
};

module.exports = {
    protectUrl,
    generateToken,
    sendTokenResponse,
    adminOnly,
    redirectIfLoggedIn
};
