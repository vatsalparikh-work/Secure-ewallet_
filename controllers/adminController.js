const { User, Transaction, Log } = require('../models');
const { Op } = require('sequelize');
const PDFDocument = require('pdfkit');

// @desc    Get all users
// @route   GET /admin/users
exports.getAllUsers = async (req, res, next) => {
    try {
        const users = await User.findAll({
            attributes: { exclude: ['password_hash', 'transaction_pin_hash'] },
            order: [['createdAt', 'DESC']]
        });
        res.status(200).json({ success: true, count: users.length, data: users });
    } catch (error) {
        next(error);
    }
};

// @desc    Freeze or Unfreeze a user
// @route   PUT /admin/users/:id/freeze
exports.toggleFreezeUser = async (req, res, next) => {
    try {
        const user = await User.findByPk(req.params.id);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Don't allow freezing yourself
        if (user.id === req.user.id) {
            return res.status(400).json({ success: false, message: 'Cannot freeze yourself' });
        }

        user.is_frozen = !user.is_frozen;
        await user.save();

        res.status(200).json({ success: true, message: `User account ${user.is_frozen ? 'frozen' : 'unfrozen'} successfully`, data: user });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete a user
// @route   DELETE /admin/users/:id
exports.deleteUser = async (req, res, next) => {
    try {
        const user = await User.findByPk(req.params.id);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Don't allow deleting yourself
        if (user.id === req.user.id) {
            return res.status(400).json({ success: false, message: 'Cannot delete yourself' });
        }

        await user.destroy();
        res.status(200).json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
        next(error);
    }
};

// @desc    Get suspicious transactions
// @route   GET /admin/suspicious-transactions
exports.getSuspiciousTransactions = async (req, res, next) => {
    try {
        // Find transactions amount > 500
        const highValueTransactions = await Transaction.findAll({
            where: { amount: { [Op.gt]: 500 } },
            include: [
                { model: User, as: 'Sender', attributes: ['name', 'email'] },
                { model: User, as: 'Receiver', attributes: ['name', 'email'] }
            ],
            order: [['createdAt', 'DESC']]
        });

        // To keep it simple for now, we just return high value transactions.
        // More than 3 transactions in 1 minute logic can be complex in a single query, 
        // we can flag them individually.

        const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
        const frequentTransactions = await Transaction.findAll({
            where: {
                createdAt: { [Op.gte]: oneMinuteAgo }
            },
            include: [
                { model: User, as: 'Sender', attributes: ['name', 'email'] },
                { model: User, as: 'Receiver', attributes: ['name', 'email'] }
            ]
        });

        // Group by sender ID
        const txCountByUser = {};
        frequentTransactions.forEach(tx => {
            txCountByUser[tx.sender_id] = (txCountByUser[tx.sender_id] || 0) + 1;
        });

        const suspiciousUserIds = Object.keys(txCountByUser).filter(id => txCountByUser[id] > 3);

        const fastTransactions = frequentTransactions.filter(tx => suspiciousUserIds.includes(tx.sender_id.toString()));

        // Combine unique transactions
        const allSuspicious = [...highValueTransactions];
        fastTransactions.forEach(tx => {
            if (!allSuspicious.find(t => t.id === tx.id)) {
                allSuspicious.push(tx);
            }
        });

        allSuspicious.sort((a, b) => b.createdAt - a.createdAt);

        res.status(200).json({ success: true, count: allSuspicious.length, data: allSuspicious });
    } catch (error) {
        next(error);
    }
};

// @desc    Get system logs
// @route   GET /admin/logs
exports.getSystemLogs = async (req, res, next) => {
    try {
        const logins = await Log.findAll({
            include: [{ model: User, attributes: ['name', 'email'] }],
            order: [['createdAt', 'DESC']],
            limit: 50
        });

        const transfers = await Transaction.findAll({
            include: [
                { model: User, as: 'Sender', attributes: ['name', 'email'] },
                { model: User, as: 'Receiver', attributes: ['name', 'email'] }
            ],
            order: [['createdAt', 'DESC']],
            limit: 50
        });

        // Format to a common structure
        const formattedLogins = logins.map(log => ({
            id: `login-${log.id}`,
            type: 'LOGIN',
            user: log.User ? log.User.name : 'Unknown User',
            email: log.User ? log.User.email : 'Unknown Email',
            ip_address: log.ip_address,
            date: log.createdAt,
            details: `Successful login from ${log.ip_address}`
        }));

        const formattedTransfers = transfers.map(tx => ({
            id: `transfer-${tx.id}`,
            type: 'TRANSFER',
            user: tx.Sender ? tx.Sender.name : 'Unknown Sender',
            email: tx.Sender ? tx.Sender.email : 'Unknown Email',
            ip_address: 'N/A',
            date: tx.createdAt,
            details: `Transferred ₹${tx.amount} to ${tx.Receiver ? tx.Receiver.name : 'Unknown Receiver'}`
        }));

        const allLogs = [...formattedLogins, ...formattedTransfers].sort((a, b) => b.date - a.date);

        res.status(200).json({ success: true, count: allLogs.length, data: allLogs });
    } catch (error) {
        next(error);
    }
};

// @desc    Download system logs as PDF
// @route   GET /admin/logs/pdf
exports.getSystemLogsPDF = async (req, res, next) => {
    try {
        const logins = await Log.findAll({
            include: [{ model: User, attributes: ['name', 'email'] }],
            order: [['createdAt', 'DESC']],
            limit: 200
        });

        const transfers = await Transaction.findAll({
            include: [
                { model: User, as: 'Sender', attributes: ['name', 'email'] },
                { model: User, as: 'Receiver', attributes: ['name', 'email'] }
            ],
            order: [['createdAt', 'DESC']],
            limit: 200
        });

        const formattedLogins = logins.map(log => ({
            id: `login-${log.id}`,
            type: 'LOGIN',
            user: log.User ? log.User.name : 'Unknown User',
            email: log.User ? log.User.email : 'Unknown Email',
            ip_address: log.ip_address,
            date: log.createdAt,
            details: `Successful login from ${log.ip_address}`
        }));

        const formattedTransfers = transfers.map(tx => ({
            id: `transfer-${tx.id}`,
            type: 'TRANSFER',
            user: tx.Sender ? tx.Sender.name : 'Unknown Sender',
            email: tx.Sender ? tx.Sender.email : 'Unknown Email',
            ip_address: 'N/A',
            date: tx.createdAt,
            details: `Transferred ₹${tx.amount} to ${tx.Receiver ? tx.Receiver.name : 'Unknown Receiver'}`
        }));

        const allLogs = [...formattedLogins, ...formattedTransfers].sort((a, b) => b.date - a.date);

        // Set Headers for PDF Download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=System_Logs_${new Date().toISOString().split('T')[0]}.pdf`);

        const doc = new PDFDocument({ margin: 50, size: 'A4', layout: 'landscape' });
        const path = require('path');
        doc.registerFont('Roboto', path.join(__dirname, '../public/fonts/Roboto-Regular.ttf'));
        doc.pipe(res);

        // PDF Styling & Header
        doc.fontSize(20).text('Secure eWallet - SystemLogs', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Generated on: ${new Date().toLocaleString()}`, { align: 'right' });
        doc.moveDown(2);

        // Table Header
        doc.fontSize(10).font('Roboto');
        doc.text('Date & Time', 50, 150);
        doc.text('Type', 200, 150);
        doc.text('User Email', 280, 150);
        doc.text('Details', 500, 150);

        doc.moveTo(50, 165).lineTo(750, 165).stroke();

        let yPos = 180;
        doc.font('Roboto');

        allLogs.forEach((log) => {
            if (yPos > 500) {
                doc.addPage();
                yPos = 50;
            }

            const truncateText = (text, maxLength) => {
                if (!text) return '';
                return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
            };

            doc.text(log.date.toLocaleDateString() + ' ' + log.date.toLocaleTimeString(), 50, yPos, { width: 140 });
            doc.text(log.type, 200, yPos, { width: 70 });
            doc.text(truncateText(log.email, 30), 280, yPos, { width: 210 });
            doc.text(truncateText(log.details, 50), 500, yPos, { width: 250 });

            yPos += 20;
            doc.moveTo(50, yPos - 5).lineTo(750, yPos - 5).strokeColor('#E0E0E0').stroke();
            doc.strokeColor('black');
            yPos += 10;
        });

        doc.end();

    } catch (error) {
        next(error);
    }
};
