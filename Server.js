

require("dotenv").config();



const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const app = express();

// ---------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------
app.use(express.json());

// Restrict which origins can call this API — replace with your real domain.
app.use(cors({
  origin: [
    "https://viewmdbltd.com",
    "https://www.viewmdbltd.com",
    "http://localhost:3000",
    "http://127.0.0.1:5500",
    "http://localhost:5500"
  ]
}));

// Basic abuse/spam protection: limit each IP to 5 submissions per 15 minutes.
const formLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { status: "error", message: "Too many submissions. Please try again later." }
});

// ---------------------------------------------------------------------
// Mail transporter — sends through your Gmail account
// ---------------------------------------------------------------------
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER, // e.g. info@viewmdbltd.com (must be a real Gmail/Workspace address)
    pass: process.env.GMAIL_APP_PASSWORD // 16-character App Password, NOT your login password
  }
});

// Verify connection on startup so misconfiguration fails loudly, not silently.
transporter.verify(function (err) {
  if (err) {
    console.error("Mail transporter failed to connect:", err.message);
  } else {
    console.log("Mail transporter ready.");
  }
});

// ---------------------------------------------------------------------
// Helper: very small server-side validation (never trust the client)
// ---------------------------------------------------------------------
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ---------------------------------------------------------------------
// Route: POST /send-brief
// Receives the contact form payload and emails it to your Gmail inbox.
// ---------------------------------------------------------------------
app.post("/send-brief", formLimiter, async (req, res) => {
  const { fullName, email, phone, service, details } = req.body || {};

  // Server-side validation — the frontend already checks this, but never
  // trust client-side validation alone.
  if (!fullName || !email || !phone || !service || !isValidEmail(email)) {
    return res.status(400).json({ status: "error", message: "Missing or invalid fields." });
  }

  const subject = `Deal Brief Inquiry — ${service}`;
  const textBody =
    `Full Name / Corporate Entity: ${fullName}\n` +
    `Email: ${email}\n` +
    `Phone: ${phone}\n` +
    `Service Category: ${service}\n\n` +
    `Project Brief / Inquiry Details:\n${details || "—"}`;

  const htmlBody = `
    <h2>New Deal Brief Inquiry</h2>
    <p><strong>Full Name / Corporate Entity:</strong> ${escapeHtml(fullName)}</p>
    <p><strong>Email:</strong> ${escapeHtml(email)}</p>
    <p><strong>Phone:</strong> ${escapeHtml(phone)}</p>
    <p><strong>Service Category:</strong> ${escapeHtml(service)}</p>
    <p><strong>Details:</strong><br>${escapeHtml(details || "—").replace(/\n/g, "<br>")}</p>
  `;

  try {
    await transporter.sendMail({
      from: `"MDB LTD Website" <${process.env.GMAIL_USER}>`, // keep "from" consistent — helps deliverability
      to: "info@viewmdbltd.com",
      replyTo: email, // lets you hit "reply" and respond straight to the inquirer
      subject: subject,
      text: textBody,
      html: htmlBody
    });

    res.json({ status: "ok" });
  } catch (err) {
    console.error("Failed to send mail:", err.message);
    res.status(500).json({ status: "error", message: "Failed to send. Please try again shortly." });
  }
});

// ---------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------
app.get("/health", (req, res) => res.json({ status: "ok" }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`MDB LTD backend listening on port ${PORT}`));

