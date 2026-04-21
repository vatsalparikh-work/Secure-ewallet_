const express = require('express');
const router = express.Router();

router.get('/about', (req, res) => {
    res.render('pages/about', {
        title: 'About Us'
    });
});

router.get('/contact', (req, res) => {
    res.render('pages/contact', {
        title: 'Contact Us'
    });
});

router.get('/terms', (req, res) => {
    res.render('pages/terms', {
        title: 'Terms of Service'
    });
});

router.get('/privacy', (req, res) => {
    res.render('pages/privacy', {
        title: 'Privacy Policy'
    });
});

module.exports = router;
