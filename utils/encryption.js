const crypto = require('crypto');
const dotenv = require('dotenv');
dotenv.config();

const algorithm = 'aes-256-cbc';
const secretKey = process.env.AES_SECRET_KEY; // Must be 32 bytes

if (!secretKey || secretKey.length !== 32) {
    console.error("FATAL ERROR: AES_SECRET_KEY is not defined or is not 32 bytes.");
    process.exit(1);
}

const ivLength = 16;

const encrypt = (text) => {
    if (!text) return null;
    const iv = crypto.randomBytes(ivLength);
    const cipher = crypto.createCipheriv(algorithm, Buffer.from(secretKey), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    // Format: iv:encryptedText (in hex)
    return iv.toString('hex') + ':' + encrypted.toString('hex');
};

const decrypt = (text) => {
    if (!text) return null;
    try {
        const textParts = text.split(':');
        const iv = Buffer.from(textParts.shift(), 'hex');
        const encryptedText = Buffer.from(textParts.join(':'), 'hex');
        const decipher = crypto.createDecipheriv(algorithm, Buffer.from(secretKey), iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    } catch (e) {
        console.error("Decryption failed:", e);
        return null;
    }
};

module.exports = {
    encrypt,
    decrypt
};
