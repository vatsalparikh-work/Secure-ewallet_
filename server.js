const express = require('express');
const dotenv = require('dotenv');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
const session = require('express-session');
const flash = require('connect-flash');
const { sequelize, User } = require('./models');
const i18n = require('./utils/i18n');

// Load env vars
dotenv.config();

const app = express();

// Set up View Engine (EJS) with Layouts
app.use(expressLayouts);
app.set('view engine', 'ejs');
app.set('layout', 'layout'); // Set default layout file: views/layout.ejs
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Middlewares
// Security Headers
app.use(helmet({
    contentSecurityPolicy: false, // For easier local development with Bootstrap via CDN if needed, else strict config
}));

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan('dev')); // Logging

// Express Session for flash messages & simple state
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === 'production', httpOnly: true }
}));
app.use(flash());

// Make flash messages available in all views
app.use(async (req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    res.locals.user = req.user || null;

    // Default values
    let userTheme = 'light';
    let userLang = 'en';
    let currentUserId = null;

    if (req.user) {
        currentUserId = req.user.id;
    } else if (req.cookies && req.cookies.jwt && req.cookies.jwt !== 'none') {
        try {
            const jwt = require('jsonwebtoken');
            const decoded = jwt.verify(req.cookies.jwt, process.env.JWT_SECRET);
            currentUserId = decoded.id;
        } catch (e) {
            // invalid token
        }
    }

    if (currentUserId) {
        try {
            const dbUser = await User.findByPk(currentUserId, { attributes: ['id', 'name', 'email', 'role', 'theme', 'language'] });
            if (dbUser) {
                userTheme = dbUser.theme || 'light';
                userLang = dbUser.language || 'en';
                res.locals.user = dbUser; // Set user globally for the header view
            }
        } catch (err) {
            console.error('Error fetching user preferences:', err);
        }
    }

    res.locals.userTheme = userTheme;
    res.locals.userLanguage = userLang;

    // Provide translation function to ejs
    res.locals.__ = (key) => i18n.translate(userLang, key);

    next();
});

// Rate limiting globally
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Routes
app.use('/auth', require('./routes/authRoutes'));
app.use('/wallet', require('./routes/walletRoutes'));
app.use('/user', require('./routes/userRoutes'));
app.use('/admin', require('./routes/adminRoutes'));
app.use('/pages', require('./routes/pageRoutes'));
app.use('/', require('./routes/dashboardRoutes'));

// 404 Fallback
app.use((req, res) => {
    res.status(404).render('404', { title: 'Page Not Found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
        success: false,
        message: err.message || 'Internal Server Error'
    });
});

const PORT = process.env.PORT || 3000;

// Sync Database & Start Server
sequelize.sync() // Removed alter: true as it causes ER_TOO_MANY_KEYS issues in MySQL for unique fields
    .then(() => {
        console.log('Database synced successfully.');
        app.listen(PORT, () => {
            console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
        });
    })
    .catch((err) => {
        console.error('Unable to connect to the database:', err);
    });
