const { User } = require('./models');
const sequelize = require('./config/database');
const dotenv = require('dotenv');

dotenv.config();

async function backfillBalanceHashes() {
    try {
        console.log('Connecting to database...');
        await sequelize.authenticate();
        console.log('Connected.');

        console.log('Fetching all users...');
        const users = await User.findAll();

        console.log(`Found ${users.length} users. Backfilling hashes...`);
        let count = 0;

        for (let user of users) {
            // Only update if no hash exists yet to be safe
            if (!user.balance_hash) {
                user.balance_hash = user.generateBalanceHash(user.wallet_balance);
                // use silent to avoid hook interference if needed, or let hooks run
                await user.save({ hooks: false });
                count++;
            }
        }

        console.log(`Successfully backfilled balance_hashes for ${count} users.`);
        process.exit(0);
    } catch (error) {
        console.error('Error backfilling hashes:', error);
        process.exit(1);
    }
}

backfillBalanceHashes();
