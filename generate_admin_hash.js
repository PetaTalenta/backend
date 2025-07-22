// Script to generate proper bcrypt hash for admin password
const bcrypt = require('./auth-service/node_modules/bcrypt');

async function generateHash() {
    const password = 'admin123';
    const saltRounds = 10;
    
    try {
        const hash = await bcrypt.hash(password, saltRounds);
        console.log('Password:', password);
        console.log('Bcrypt Hash:', hash);
        console.log('\nSQL Update Query:');
        console.log(`UPDATE auth.users SET password_hash = '${hash}' WHERE email = 'admin@atma.com';`);
    } catch (error) {
        console.error('Error generating hash:', error);
    }
}

generateHash();
