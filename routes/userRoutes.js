const express = require('express');
const { body } = require('express-validator');
const multer = require('multer');
const path = require('path');
const { protectUrl } = require('../middlewares/authMiddleware');
const { getProfile, setPin, updatePassword, updateLocation, uploadPhoto, removePhoto, updatePreferences } = require('../controllers/userController');

const router = express.Router();

// Setup Multer for profile photo
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/profiles/');
    },
    filename: function (req, file, cb) {
        cb(null, `profile-${req.user.id}-${Date.now()}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|webp/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Images only! (jpeg, jpg, png, webp)'));
    }
});

// All user routes are protected
router.use(protectUrl);

router.get('/profile', getProfile);

// Route for setting or updating PIN
router.post('/pin', [
    body('newPin')
        .isLength({ min: 6, max: 6 }).withMessage('PIN must be exactly 6 digits')
        .isNumeric().withMessage('PIN must contain only numbers')
], setPin);

router.post('/password', updatePassword);
router.post('/location', updateLocation);
router.post('/photo', upload.single('profile_photo'), uploadPhoto);
router.post('/photo/remove', removePhoto);
router.post('/preferences', updatePreferences);

module.exports = router;
