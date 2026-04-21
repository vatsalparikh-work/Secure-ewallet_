const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const crypto = require('crypto');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true
        }
    },
    phone: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    password_hash: {
        type: DataTypes.STRING,
        allowNull: false
    },
    login_attempts: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false
    },
    transaction_pin_hash: {
        type: DataTypes.STRING,
        allowNull: true // Set later by user
    },
    wallet_balance: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.00,
        allowNull: false
    },
    balance_hash: {
        type: DataTypes.STRING,
        allowNull: true
    },
    is_verified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    role: {
        type: DataTypes.ENUM('user', 'admin'),
        defaultValue: 'user'
    },
    is_frozen: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    profile_photo: {
        type: DataTypes.STRING,
        allowNull: true
    },
    location: {
        type: DataTypes.STRING,
        allowNull: true
    },
    theme: {
        type: DataTypes.ENUM('light', 'dark'),
        defaultValue: 'light'
    },
    language: {
        type: DataTypes.STRING,
        defaultValue: 'en'
    }
}, {
    timestamps: true,
    tableName: 'users',
    hooks: {
        beforeSave: (user, options) => {
            if (user.changed('wallet_balance') || !user.balance_hash) {
                user.balance_hash = user.generateBalanceHash(user.wallet_balance);
            }
        }
    }
});

User.prototype.generateBalanceHash = function (balance) {
    const secret = process.env.HMAC_SECRET || 'fallback-secret-for-dev-only-change-in-prod';
    const amountStr = parseFloat(balance).toFixed(2).toString();
    return crypto.createHmac('sha256', secret).update(amountStr).digest('hex');
};

User.prototype.verifyBalanceIntegrity = function () {
    if (!this.balance_hash) return true; // For legacy users without a hash initially
    const expectedHash = this.generateBalanceHash(this.wallet_balance);
    return this.balance_hash === expectedHash;
};

module.exports = User;
