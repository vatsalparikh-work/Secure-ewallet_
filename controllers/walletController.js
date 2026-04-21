const { User, Transaction, sequelize } = require('../models');
const bcrypt = require('bcrypt');
const { encrypt, decrypt } = require('../utils/encryption');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');
const PDFDocument = require('pdfkit');

// @desc    Add money to wallet
// @route   POST /wallet/add
exports.addMoney = async (req, res, next) => {
    try {
        const { amount } = req.body;
        const parsedAmount = parseFloat(amount);

        if (!parsedAmount || parsedAmount <= 0) {
            req.flash('error_msg', 'Please enter a valid amount.');
            return res.redirect('/dashboard');
        }

        const user = await User.findByPk(req.user.id);

        // Add money directly (Simulating payment gateway success)
        user.wallet_balance = parseFloat(user.wallet_balance) + parsedAmount;
        await user.save();

        req.flash('success_msg', `Successfully added ₹${parsedAmount} to your wallet.`);
        res.redirect('/dashboard');
    } catch (err) {
        next(err);
    }
};

// @desc    Transfer Money to another user
// @route   POST /wallet/transfer
exports.transferMoney = async (req, res, next) => {
    // using unmanaged transactions for fine-grained control or managed callback
    const t = await sequelize.transaction();

    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            await t.rollback();
            req.flash('error_msg', errors.array().map(e => e.msg).join(', '));
            return res.redirect('/wallet/transfer');
        }

        const { receiverEmail, amount, pin, note } = req.body;
        const transferAmount = parseFloat(amount);

        // 1. Basic Validations
        if (transferAmount <= 0) {
            await t.rollback();
            req.flash('error_msg', 'Amount must be greater than zero.');
            return res.redirect('/wallet/transfer');
        }

        const sender = await User.findByPk(req.user.id, { transaction: t });

        if (sender.is_frozen) {
            await t.rollback();
            req.flash('error_msg', 'Account frozen. Contact admin.');
            return res.redirect('/wallet/transfer');
        }

        if (sender.email === receiverEmail) {
            await t.rollback();
            req.flash('error_msg', 'You cannot transfer money to yourself.');
            return res.redirect('/wallet/transfer');
        }

        const receiver = await User.findOne({ where: { email: receiverEmail }, transaction: t });
        if (!receiver) {
            await t.rollback();
            req.flash('error_msg', 'Receiver email not found.');
            return res.redirect('/wallet/transfer');
        }

        // 2. PIN Validation
        if (!sender.transaction_pin_hash) {
            await t.rollback();
            req.flash('error_msg', 'Please set up a Transaction PIN in your Profile first.');
            return res.redirect('/user/profile');
        }

        const isMatch = await bcrypt.compare(pin, sender.transaction_pin_hash);
        if (!isMatch) {
            await t.rollback();
            req.flash('error_msg', 'Invalid Transaction PIN.');
            return res.redirect('/wallet/transfer');
        }

        // 3. Balance Check & Integrity Check
        if (!sender.verifyBalanceIntegrity()) {
            await t.rollback();
            console.error(`SECURITY ALERT: Balance integrity check failed for user ${sender.id}. Possible database tampering.`);
            req.flash('error_msg', 'Security error: Account balance integrity validation failed. Please contact support.');
            return res.redirect('/wallet/transfer');
        }

        if (parseFloat(sender.wallet_balance) < transferAmount) {
            await t.rollback();
            req.flash('error_msg', 'Insufficient wallet balance.');
            return res.redirect('/wallet/transfer');
        }

        // 4. ATOMIC Deduct and Add
        // Subtract from sender
        sender.wallet_balance = parseFloat(sender.wallet_balance) - transferAmount;
        await sender.save({ transaction: t });

        // Add to receiver
        receiver.wallet_balance = parseFloat(receiver.wallet_balance) + transferAmount;
        await receiver.save({ transaction: t });

        // 5. Create Transaction Record
        const encryptedNote = note ? encrypt(note) : null;
        await Transaction.create({
            sender_id: sender.id,
            receiver_id: receiver.id,
            amount: transferAmount,
            encrypted_note: encryptedNote,
            status: 'COMPLETED'
        }, { transaction: t });

        // 6. Commit transaction
        await t.commit();
        req.flash('success_msg', `Successfully transferred ₹${transferAmount} to ${receiver.name}.`);
        res.redirect('/dashboard');
    } catch (err) {
        await t.rollback();
        console.error("Transfer error:", err);
        req.flash('error_msg', 'Transfer failed due to an internal error. Rollback successful.');
        // In real world, log this critical error thoroughly
        res.redirect('/wallet/transfer');
    }
};

// @desc    View specific transaction history with filters
// @route   GET /wallet/history
exports.getHistory = async (req, res, next) => {
    try {
        const { type, fromDate, toDate, page } = req.query; // all, debit, credit
        let whereClause = {
            [Op.or]: [
                { sender_id: req.user.id },
                { receiver_id: req.user.id }
            ]
        };

        if (type === 'debit') {
            whereClause = { sender_id: req.user.id };
        } else if (type === 'credit') {
            whereClause = { receiver_id: req.user.id };
        }

        // Add date filters
        if (fromDate || toDate) {
            whereClause.createdAt = {};
            if (fromDate) {
                whereClause.createdAt[Op.gte] = new Date(fromDate);
            }
            if (toDate) {
                const endOfDay = new Date(toDate);
                endOfDay.setHours(23, 59, 59, 999);
                whereClause.createdAt[Op.lte] = endOfDay;
            }
        }

        // Pagination setup
        const limit = 5;
        const currentPage = page ? parseInt(page) : 1;
        const offset = (currentPage - 1) * limit;

        const { count, rows: txHistory } = await Transaction.findAndCountAll({
            where: whereClause,
            order: [['createdAt', 'DESC']],
            include: [
                { model: User, as: 'Sender', attributes: ['name', 'email'] },
                { model: User, as: 'Receiver', attributes: ['name', 'email'] }
            ],
            limit: limit,
            offset: offset
        });

        const totalPages = Math.ceil(count / limit);

        const transactions = txHistory.map(tx => {
            let note = tx.encrypted_note ? decrypt(tx.encrypted_note) : '';
            const isDebit = tx.sender_id === req.user.id;
            return {
                id: tx.id,
                type: isDebit ? 'DEBIT' : 'CREDIT',
                amount: tx.amount,
                status: tx.status,
                date: tx.createdAt,
                note,
                otherParty: isDebit
                    ? (tx.Receiver ? tx.Receiver.name : 'Unknown User')
                    : (tx.Sender ? tx.Sender.name : 'Unknown User')
            }
        });

        res.render('wallet/history', {
            title: 'Transaction History',
            transactions,
            filter: type || 'all',
            fromDate: fromDate || '',
            toDate: toDate || '',
            currentPage,
            totalPages
        });
    } catch (err) {
        next(err);
    }
};

// @desc    Download transaction history as PDF
// @route   GET /wallet/history/pdf
exports.getHistoryPDF = async (req, res, next) => {
    try {
        const { type, fromDate, toDate } = req.query;
        let whereClause = {
            [Op.or]: [
                { sender_id: req.user.id },
                { receiver_id: req.user.id }
            ]
        };

        if (type === 'debit') {
            whereClause = { sender_id: req.user.id };
        } else if (type === 'credit') {
            whereClause = { receiver_id: req.user.id };
        }

        if (fromDate || toDate) {
            whereClause.createdAt = {};
            if (fromDate) {
                whereClause.createdAt[Op.gte] = new Date(fromDate);
            }
            if (toDate) {
                const endOfDay = new Date(toDate);
                endOfDay.setHours(23, 59, 59, 999);
                whereClause.createdAt[Op.lte] = endOfDay;
            }
        }

        const txHistory = await Transaction.findAll({
            where: whereClause,
            order: [['createdAt', 'DESC']],
            include: [
                { model: User, as: 'Sender', attributes: ['name', 'email'] },
                { model: User, as: 'Receiver', attributes: ['name', 'email'] }
            ]
        });

        // Set Headers for PDF Download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Transaction_Statement_${new Date().toISOString().split('T')[0]}.pdf`);

        const doc = new PDFDocument({ margin: 50 });
        const path = require('path');
        doc.registerFont('Roboto', path.join(__dirname, '../public/fonts/Roboto-Regular.ttf'));
        doc.pipe(res);

        // PDF Styling & Header
        doc.fontSize(20).text('Secure eWallet - Transaction Statement', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Generated on: ${new Date().toLocaleString()}`, { align: 'right' });
        doc.moveDown(2);

        // Table Header
        doc.fontSize(12).font('Roboto');
        doc.text('Date & Time', 50, 150);
        doc.text('Party', 200, 150);
        doc.text('Type', 350, 150);
        doc.text('Amount', 450, 150, { align: 'right' });

        doc.moveTo(50, 165).lineTo(550, 165).stroke();

        // Table Content
        let yPos = 180;
        doc.font('Roboto');

        txHistory.forEach((tx) => {
            const isDebit = tx.sender_id === req.user.id;
            const receiverName = tx.Receiver ? tx.Receiver.name : 'Unknown';
            const senderName = tx.Sender ? tx.Sender.name : 'Unknown';
            const partyStr = isDebit ? `To: ${receiverName}` : `From: ${senderName}`;
            const amountStr = (isDebit ? '-₹' : '+₹') + parseFloat(tx.amount).toFixed(2);

            if (yPos > 700) {
                // Add new page if list exceeds page length
                doc.addPage();
                yPos = 50;
            }

            doc.text(tx.createdAt.toLocaleDateString() + ' ' + tx.createdAt.toLocaleTimeString(), 50, yPos, { width: 140 });
            doc.text(partyStr, 200, yPos, { width: 140 });
            doc.text(isDebit ? 'DEBIT' : 'CREDIT', 350, yPos);
            doc.text(amountStr, 450, yPos, { align: 'right' });

            yPos += 20;
            doc.moveTo(50, yPos - 5).lineTo(550, yPos - 5).strokeColor('#E0E0E0').stroke();
            doc.strokeColor('black'); // Reset stroke color
            yPos += 10;
        });

        doc.end();
    } catch (err) {
        next(err);
    }
};
