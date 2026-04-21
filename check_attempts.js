const { User } = require('./models');

async function checkAttempts() {
    try {
        const users = await User.findAll({ attributes: ['email', 'login_attempts'] });
        console.table(users.map(u => u.toJSON()));
    } catch (err) {
        console.error(err);
    }
}
checkAttempts();
