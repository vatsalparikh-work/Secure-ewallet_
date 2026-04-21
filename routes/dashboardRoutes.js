const express = require('express');
const { protectUrl, redirectIfLoggedIn } = require('../middlewares/authMiddleware');
const { getDashboard } = require('../controllers/dashboardController');

const router = express.Router();

// Web Landing Page
router.get('/', redirectIfLoggedIn, (req, res) => {
    res.render('index', { title: 'Welcome to Secure eWallet' });
});

router.get('/dashboard', protectUrl, getDashboard);

module.exports = router;
