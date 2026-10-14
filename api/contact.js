// Serverless version of POST /api/contact, for hosts like Vercel where
// server.js doesn't run. There's no disk to store messages on, so this
// only works once SMTP is configured.

const { parseSubmission, smtpConfigured, sendEmail } = require("./_lib/contact");

module.exports = async function handler(req, res) {
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const body = typeof req.body === "string" ? parseJson(req.body) : req.body;
    const submission = parseSubmission(body || {});

    if (submission.spam) return res.status(200).json({ ok: true });
    if (submission.error) return res.status(400).json({ ok: false, error: submission.error });

    if (!smtpConfigured()) {
        console.warn("[contact] SMTP not configured; message dropped:", submission.email);
        return res.status(503).json({
            ok: false,
            error: "The contact service isn't configured yet. Please email me directly.",
        });
    }

    try {
        await sendEmail(submission);
    } catch (err) {
        console.error("[contact] send failed:", err.message);
        return res.status(502).json({
            ok: false,
            error: "Couldn't deliver your message. Please email me directly.",
        });
    }

    return res.status(200).json({ ok: true });
};

function parseJson(raw) {
    try {
        return JSON.parse(raw);
    } catch {
        return {};
    }
}
