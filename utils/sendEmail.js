const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    // For local dev without real mail server, using ethereal email or simply logging it:
    // This is useful since no cloud API was requested. We will just use console log if no SMTP provided.

    // Create a transporter
    let transporter;
    if (process.env.SMTP_EMAIL && process.env.SMTP_PASSWORD) {
        transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.SMTP_EMAIL,
                pass: process.env.SMTP_PASSWORD
            }
        });
    } else {
        // Fallback or dev: we just simulate
        console.log("-----------------------------------------");
        console.log(`[SIMULATED EMAIL] To: ${options.email}`);
        console.log(`[SIMULATED EMAIL] Subject: ${options.subject}`);
        console.log(`[SIMULATED EMAIL] Message: ${options.message}`);
        console.log("-----------------------------------------");
        return;
    }

    const message = {
        from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
        to: options.email,
        subject: options.subject,
        text: options.message
    };

    const info = await transporter.sendMail(message);
    console.log('Message sent: %s', info.messageId);
};

module.exports = sendEmail;
