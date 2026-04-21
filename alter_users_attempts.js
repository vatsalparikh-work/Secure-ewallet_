const sequelize = require('./config/database');

async function alterTable() {
    try {
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');

        await sequelize.query('ALTER TABLE users ADD COLUMN login_attempts INT NOT NULL DEFAULT 0;');
        console.log('Added login_attempts column successfully.');
    } catch (error) {
        console.error('Unable to connect to the database or alter table:', error);
    } finally {
        await sequelize.close();
    }
}

alterTable();
