const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASS || '', // if DB_PASS is empty string, use empty string
    {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 3306,
        dialect: 'mysql',
        logging: false, // Set to console.log to see SQL queries
    }
);

// Test the connection logic but don't execute it repeatedly on import. It'll be done in server.js
module.exports = sequelize;
