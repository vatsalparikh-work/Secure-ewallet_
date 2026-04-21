const express = require('express');
const { body } = require('express-validator');
const { protectUrl } = require('../middlewares/authMiddleware');
const { addMoney, transferMoney, getHistory, getHistoryPDF } = require('../controllers/walletController');

const router = express.Router();

router.use(protectUrl);

router.post('/add', [
    body('amount').isNumeric().withMessage('Amount must be a number')
], addMoney);

router.get('/transfer', (req, res) => {
    res.render('wallet/transfer', { title: 'Transfer Money' });
});

router.post('/transfer', [
    body('receiverEmail').isEmail().withMessage('Valid receiver email is required'),
    body('amount').isNumeric().withMessage('Amount must be a number'),
    body('pin').isLength({ min: 6, max: 6 }).withMessage('6-digit PIN is required'),
], transferMoney);

router.get('/history', getHistory);
router.get('/history/pdf', getHistoryPDF);

module.exports = router;
