const { User } = require('../models');
const bcrypt = require('bcrypt');
const { validationResult } = require('express-validator');

// @desc    Get user profile
// @route   GET /user/profile
exports.getProfile = async (req, res, next) => {
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: ['id', 'name', 'email', 'phone', 'wallet_balance', 'createdAt', 'transaction_pin_hash', 'profile_photo', 'location', 'theme', 'language']
        });

        res.render('user/profile', {
            title: 'My Profile',
            userProfile: user,
            hasPin: !!user.transaction_pin_hash
        });
    } catch (err) {
        next(err);
    }
};

// @desc    Set or Change Transaction PIN
// @route   POST /user/pin
exports.setPin = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            req.flash('error_msg', errors.array().map(e => e.msg).join(', '));
            return res.redirect('/user/profile');
        }

        const { currentPin, newPin, confirmPin } = req.body;

        if (newPin !== confirmPin) {
            req.flash('error_msg', 'New PIN and Confirm PIN do not match.');
            return res.redirect('/user/profile');
        }

        const user = await User.findByPk(req.user.id);

        // If user already has a PIN, require current PIN validation
        if (user.transaction_pin_hash) {
            if (!currentPin) {
                req.flash('error_msg', 'Current PIN is required to set a new PIN.');
                return res.redirect('/user/profile');
            }
            const isMatch = await bcrypt.compare(currentPin, user.transaction_pin_hash);
            if (!isMatch) {
                req.flash('error_msg', 'Incorrect Current PIN.');
                return res.redirect('/user/profile');
            }
        }

        // Hash new PIN separately with bcrypt, 12 rounds
        const salt = await bcrypt.genSalt(12);
        const pinHash = await bcrypt.hash(newPin, salt);

        user.transaction_pin_hash = pinHash;
        await user.save();

        req.flash('success_msg', 'Transaction PIN has been updated securely.');
        res.redirect('/user/profile');
    } catch (err) {
        next(err);
    }
};

// @desc    Update Password
// @route   POST /user/password
exports.updatePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;
        if (newPassword !== confirmPassword) {
            req.flash('error_msg', 'New Password and Confirm Password do not match.');
            return res.redirect('/user/profile');
        }

        const user = await User.findByPk(req.user.id);
        const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isMatch) {
            req.flash('error_msg', 'Incorrect Current Password.');
            return res.redirect('/user/profile');
        }

        const salt = await bcrypt.genSalt(12);
        user.password_hash = await bcrypt.hash(newPassword, salt);
        await user.save();

        req.flash('success_msg', 'Password has been updated securely.');
        res.redirect('/user/profile');
    } catch (err) {
        next(err);
    }
};

// @desc    Update Location
// @route   POST /user/location
exports.updateLocation = async (req, res, next) => {
    try {
        const { location } = req.body;
        const user = await User.findByPk(req.user.id);
        user.location = location;
        await user.save();
        req.flash('success_msg', 'Location updated successfully.');
        res.redirect('/user/profile');
    } catch (err) {
        next(err);
    }
};

// @desc    Upload Profile Photo
// @route   POST /user/photo
exports.uploadPhoto = async (req, res, next) => {
    try {
        if (!req.file) {
            req.flash('error_msg', 'Please select an image file to upload.');
            return res.redirect('/user/profile');
        }

        const photoUrl = `/uploads/profiles/${req.file.filename}`;
        const user = await User.findByPk(req.user.id);
        user.profile_photo = photoUrl;
        await user.save();

        req.flash('success_msg', 'Profile photo updated successfully.');
        res.redirect('/user/profile');
    } catch (err) {
        req.flash('error_msg', err.message || 'Error uploading photo.');
        res.redirect('/user/profile');
    }
};

// @desc    Remove Profile Photo
// @route   POST /user/photo/remove
exports.removePhoto = async (req, res, next) => {
    try {
        const user = await User.findByPk(req.user.id);
        user.profile_photo = null;
        await user.save();

        req.flash('success_msg', 'Profile photo removed successfully.');
        res.redirect('/user/profile');
    } catch (err) {
        next(err);
    }
};

// @desc    Update Preferences
// @route   POST /user/preferences
exports.updatePreferences = async (req, res, next) => {
    try {
        const { theme, language } = req.body;
        const user = await User.findByPk(req.user.id);
        if (theme) user.theme = theme;
        if (language) user.language = language;

        await user.save();

        req.flash('success_msg', 'Personalization settings updated successfully.');
        res.redirect('/user/profile');
    } catch (err) {
        next(err);
    }
};
