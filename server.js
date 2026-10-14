// Serves the static site and POST /api/contact. Messages are appended to
// data/messages.json and, if SMTP is configured, emailed as well.

"use strict";

require("dotenv").config();

const path = require("path");
const fs = require("fs");
const express = require("express");
const { parseSubmission, smtpConfigured, sendEmail } = require("./api/_lib/contact");

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const MESSAGES_FILE = path.join(DATA_DIR, "messages.json");
const NOT_FOUND_PAGE = path.join(ROOT, "404.html");

const MAX_STORED_MESSAGES = 5000;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 5;

const emailEnabled = smtpConfigured();

// Storage

function loadMessages() {
    try {
        const parsed = JSON.parse(fs.readFileSync(MESSAGES_FILE, "utf8"));
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function saveMessage(entry) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const messages = [...loadMessages(), entry].slice(-MAX_STORED_MESSAGES);

    // Write then rename, so a crash mid-write can't truncate the file.
    const tmp = `${MESSAGES_FILE}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(messages, null, 2), "utf8");
    fs.renameSync(tmp, MESSAGES_FILE);
}

// Rate limiting: RATE_MAX submissions per IP per RATE_WINDOW_MS.

const hits = new Map();

function recentHits(ip, now) {
    return (hits.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
}

function rateLimit(req, res, next) {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const now = Date.now();
    const recent = recentHits(ip, now);

    if (recent.length >= RATE_MAX) {
        const retryAfter = Math.ceil((RATE_WINDOW_MS - (now - recent[0])) / 1000);
        res.setHeader("Retry-After", String(retryAfter));
        return res.status(429).json({
            ok: false,
            error: "Too many messages from this address. Please try again later.",
        });
    }

    hits.set(ip, [...recent, now]);
    next();
}

setInterval(() => {
    const now = Date.now();
    for (const ip of hits.keys()) {
        const recent = recentHits(ip, now);
        if (recent.length) hits.set(ip, recent);
        else hits.delete(ip);
    }
}, RATE_WINDOW_MS).unref();

// App

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", process.env.TRUST_PROXY === "true");

app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
    next();
});

app.use(express.json({ limit: "16kb" }));

// API routes go before express.static so nothing under /api is served as a file.

app.get("/api/health", (req, res) => {
    res.json({
        ok: true,
        uptime: Math.round(process.uptime()),
        email: emailEnabled ? "configured" : "disabled",
    });
});

app.post("/api/contact", rateLimit, async (req, res) => {
    const submission = parseSubmission(req.body || {});

    if (submission.spam) return res.json({ ok: true });
    if (submission.error) return res.status(400).json({ ok: false, error: submission.error });

    const entry = {
        ...submission,
        at: new Date().toISOString(),
        ip: req.ip,
        userAgent: String(req.get("user-agent") || "").slice(0, 200),
    };

    try {
        saveMessage(entry);
    } catch (err) {
        console.error("[contact] save failed:", err);
        return res.status(500).json({
            ok: false,
            error: "Couldn't save your message. Try emailing me directly.",
        });
    }

    console.log(`[contact] stored message from ${entry.email}`);

    if (emailEnabled) {
        try {
            await sendEmail(entry);
        } catch (err) {
            // The message is already stored, so the request still succeeds.
            console.error("[contact] email send failed:", err.message);
        }
    }

    res.json({ ok: true });
});

app.all("/api/*", (req, res) => {
    res.status(404).json({ ok: false, error: "Not found" });
});

// The site is served from the repo root, so keep server-side files private.
const PRIVATE_PATHS =
    /^\/(?:server\.js|data\/|node_modules\/|package(?:-lock)?\.json|vercel\.json|\.(?:env|idea|vscode|git))/i;

app.use((req, res, next) => {
    if (PRIVATE_PATHS.test(req.path)) return res.status(404).sendFile(NOT_FOUND_PAGE);
    next();
});

app.use(
    express.static(ROOT, {
        extensions: ["html"],
        dotfiles: "deny",
        setHeaders(res, filePath) {
            // Filenames aren't hashed, so HTML always revalidates.
            const cache = filePath.endsWith(".html") ? "no-cache" : "public, max-age=86400";
            res.setHeader("Cache-Control", cache);
        },
    })
);

app.use((req, res) => {
    res.status(404).sendFile(NOT_FOUND_PAGE);
});

app.use((err, req, res, next) => {
    console.error("[server]", err);
    if (res.headersSent) return next(err);

    const badRequest = err.type === "entity.parse.failed" || err.type === "entity.too.large";
    res.status(badRequest ? 400 : 500).json({
        ok: false,
        error: badRequest ? "Malformed request." : "Something went wrong.",
    });
});

// Startup

const server = app.listen(PORT, HOST, () => {
    console.log(`Portfolio running at http://localhost:${PORT}`);
    console.log(`Contact email: ${emailEnabled ? "SMTP configured" : "storing to data/messages.json only"}`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => {
        console.log(`\n${signal}, shutting down.`);
        server.close(() => process.exit(0));
        setTimeout(() => process.exit(1), 5000).unref();
    });
}

module.exports = app;
