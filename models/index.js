const sequelize = require('../config/database');
const User = require('./User');
const Transaction = require('./Transaction');
const OTP = require('./OTP');
const Log = require('./Log');

// User - OTP Association
User.hasMany(OTP, { foreignKey: 'user_id' });
OTP.belongsTo(User, { foreignKey: 'user_id' });

// User - Log Association
User.hasMany(Log, { foreignKey: 'user_id' });
Log.belongsTo(User, { foreignKey: 'user_id' });

// User - Transaction Associations
User.hasMany(Transaction, { as: 'SentTransactions', foreignKey: 'sender_id' });
User.hasMany(Transaction, { as: 'ReceivedTransactions', foreignKey: 'receiver_id' });

Transaction.belongsTo(User, { as: 'Sender', foreignKey: 'sender_id' });
Transaction.belongsTo(User, { as: 'Receiver', foreignKey: 'receiver_id' });

module.exports = {
    sequelize,
    User,
    Transaction,
    OTP,
    Log
};
