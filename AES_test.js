const crypto = require('crypto');

// 암복호화 관련
const key = 'abcdefghabcdefghabcdefghabcdefgh';
const iv = '0123456701234567';

// 암호화 AES256
function encrypt(data) {
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypt = cipher.update(data, 'utf8', 'base64');
    encrypt += cipher.final('base64');
    return encrypt
}

// 복호화 AES256
function decrypt(data) {
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypt = decipher.update(data, 'base64', 'utf8');
    decrypt += decipher.final('utf8');
    return decrypt
}

// 암복호화 테스트
console.log(`/get-point?uid=${encrypt("Function")}&point=${encrypt("1200000")}`)