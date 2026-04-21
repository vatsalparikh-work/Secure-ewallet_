const express = require('express');
const {
    getAllUsers,
    toggleFreezeUser,
    deleteUser,
    getSuspiciousTransactions,
    getSystemLogs,
    getSystemLogsPDF
} = require('../controllers/adminController');
const { protectUrl, adminOnly } = require('../middlewares/authMiddleware');

const router = express.Router();

// Apply middleware to all admin routes
router.use(protectUrl);
router.use(adminOnly);

router.get('/users', getAllUsers);
router.put('/users/:id/freeze', toggleFreezeUser);
router.delete('/users/:id', deleteUser);
router.get('/suspicious-transactions', getSuspiciousTransactions);
router.get('/logs', getSystemLogs);
router.get('/logs/pdf', getSystemLogsPDF);

module.exports = router;
