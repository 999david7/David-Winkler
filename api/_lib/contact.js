// Shared by server.js and the serverless handler in api/contact.js.
// The leading underscore keeps Vercel from deploying this file as a function.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_LENGTH = { name: 100, email: 254, message: 5000 };

// Returns { spam: true } for honeypot hits, { error } for bad input,
// or { name, email, message } when the submission is usable.
function parseSubmission(body = {}) {
    if (String(body.website || "").trim()) return { spam: true };

    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim();
    const message = String(body.message || "").trim();

    if (!name || !email || !message) {
        return { error: "Name, email and message are all required." };
    }
    if (!EMAIL_RE.test(email)) {
        return { error: "That doesn't look like a valid email address." };
    }
    if (
        name.length > MAX_LENGTH.name ||
        email.length > MAX_LENGTH.email ||
        message.length > MAX_LENGTH.message
    ) {
        return { error: "That message is too long to send." };
    }

    return { name, email, message };
}

function smtpConfigured() {
    const { CONTACT_EMAIL, SMTP_HOST, SMTP_USER, SMTP_PASS } = process.env;
    return Boolean(CONTACT_EMAIL && SMTP_HOST && SMTP_USER && SMTP_PASS);
}

async function sendEmail({ name, email, message }) {
    const nodemailer = require("nodemailer");
    const env = process.env;

    const transport = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: Number(env.SMTP_PORT) || 587,
        secure: env.SMTP_SECURE === "true",
        auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    });

    await transport.sendMail({
        from: env.SMTP_FROM || env.SMTP_USER,
        to: env.CONTACT_EMAIL,
        replyTo: email,
        subject: `Portfolio contact: ${name}`,
        text: `From: ${name} <${email}>\n\n${message}`,
    });
}

module.exports = { parseSubmission, smtpConfigured, sendEmail };
