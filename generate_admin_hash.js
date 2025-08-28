// Script to generate proper bcrypt hash for user password
const bcrypt = require('./auth-service/node_modules/bcrypt');

async function generateHash() {
    const password = 'Anjas123';
    const saltRounds = 10;
    
    try {
        const hash = await bcrypt.hash(password, saltRounds);
        console.log('Password:', password);
        console.log('Bcrypt Hash:', hash);
        console.log('\nSQL Insert Query:');
        console.log(`INSERT INTO auth.users (id, username, email, password_hash, user_type, is_active, token_balance) VALUES (uuid_generate_v4(), 'rayin', 'kasykoi@gmail.com', '${hash}', 'user', true, 0);`);
    } catch (error) {
        console.error('Error generating hash:', error);
    }
}

generateHash();
