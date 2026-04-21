const { User, Transaction, sequelize } = require('../models');
const { decrypt } = require('../utils/encryption');
const { Op } = require('sequelize');

// @desc    Get dashboard (wallet balance)
// @route   GET /dashboard
exports.getDashboard = async (req, res, next) => {
    console.log("Dashboard route hit");
    console.log("User:", req.user ? req.user.id : "None");
    try {
        const user = await User.findByPk(req.user.id);

        if (!user) {
            req.flash('error_msg', 'User not found');
            return res.redirect('/auth/login');
        }

        // Fetch recent 5 transactions
        const recentTx = await Transaction.findAll({
            where: {
                [Op.or]: [
                    { sender_id: req.user.id },
                    { receiver_id: req.user.id }
                ]
            },
            order: [['createdAt', 'DESC']],
            limit: 5,
            include: [
                { model: User, as: 'Sender', attributes: ['name', 'email'] },
                { model: User, as: 'Receiver', attributes: ['name', 'email'] }
            ]
        });

        // Decrypt notes for display
        const transactions = recentTx.map(tx => {
            let note = tx.encrypted_note ? decrypt(tx.encrypted_note) : '';
            return {
                id: tx.id,
                type: tx.sender_id === req.user.id ? 'DEBIT' : 'CREDIT',
                amount: tx.amount,
                status: tx.status,
                date: tx.createdAt,
                note,
                otherParty: tx.sender_id === req.user.id 
                    ? (tx.Receiver ? tx.Receiver.name : 'System/Deleted User') 
                    : (tx.Sender ? tx.Sender.name : 'System/Deleted User')
            }
        });

        // Disable caching so dashboard can't be fetched via back button after logout
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');

        res.render('dashboard', {
            title: 'Dashboard',
            balance: user.wallet_balance || 0.00,
            transactions
        });
    } catch (err) {
        next(err);
    }
};
