const sequelize = require('./config/database');
const { QueryTypes } = require('sequelize');

async function alterTable() {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        // Add theme column if it doesn't exist
        try {
            await sequelize.query(`ALTER TABLE users ADD COLUMN theme ENUM('light', 'dark') DEFAULT 'light'`, { type: QueryTypes.RAW });
            console.log('Added theme column.');
        } catch (e) {
            console.log('Theme column might already exist:', e.message);
        }

        // Add language column if it doesn't exist
        try {
            await sequelize.query(`ALTER TABLE users ADD COLUMN language VARCHAR(255) DEFAULT 'en'`, { type: QueryTypes.RAW });
            console.log('Added language column.');
        } catch (e) {
            console.log('Language column might already exist:', e.message);
        }

        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Error altering table:', error);
        process.exit(1);
    }
}

alterTable();
