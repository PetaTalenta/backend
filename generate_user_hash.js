// Script to generate bcrypt hash for Anjas123
const crypto = require('crypto');

function generateSimpleHash(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    console.log('Password:', password);
    console.log('Simple Hash:', hash);
    console.log('\nSQL Update Query:');
    console.log(`UPDATE auth.users SET password_hash = '${hash}' WHERE email = 'kasykoi@gmail.com';`);
}

generateSimpleHash('Anjas123');
