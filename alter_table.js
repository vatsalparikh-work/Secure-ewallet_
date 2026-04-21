const sequelize = require('./config/database');
const { DataTypes } = require('sequelize');

async function alterTable() {
    try {
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');

        await sequelize.query('ALTER TABLE users ADD COLUMN balance_hash VARCHAR(255) NULL;');
        console.log('Added balance_hash column successfully.');
    } catch (error) {
        console.error('Unable to connect to the database or alter table:', error);
    } finally {
        await sequelize.close();
    }
}

alterTable();
