/* =====================================================================
   MDB LTD — Contact Form Backend (Vercel Serverless Function)
   ---------------------------------------------------------------------
   This file lives at /api/send-brief.js. Vercel automatically turns any
   file inside the /api folder into a live endpoint — so this becomes:

       https://YOUR-PROJECT-NAME.vercel.app/api/send-brief

   No Express server needed — Vercel handles the routing for you.
===================================================================== */

const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,          // set in Vercel dashboard, not here
    pass: process.env.GMAIL_APP_PASSWORD   // set in Vercel dashboard, not here
  }
});

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

module.exports = async (req, res) => {
  // ---- CORS: only allow requests from your real website domain ----
  // Add/adjust origins here as needed (e.g. add your Vercel preview URL
  // while testing, remove it once you go live).
  const allowedOrigins = [
    "https://viewmdbltd.com",
    "https://vercel.com/hannas04s-projects/mdb-org",
    "https://www.viewmdbltd.com",
    "http://127.0.0.1:5500",   // Live Server, for local testing — remove later
    "http://localhost:5500"
  ];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Browsers send an OPTIONS preflight request before the real POST —
  // just acknowledge it and stop here.
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ status: "error", message: "Method not allowed" });
  }

  const { fullName, email, phone, service, details } = req.body || {};

  // Server-side validation — never trust the client alone.
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
      from: `"MDB LTD Website" <${process.env.GMAIL_USER}>`,
      to: "info@viewmdbltd.com",   // change this if you want a different recipient
      replyTo: email,              // lets you hit "reply" and respond straight to the inquirer
      subject: subject,
      text: textBody,
      html: htmlBody
    });

    return res.status(200).json({ status: "ok" });
  } catch (err) {
    console.error("Failed to send mail:", err.message);
    return res.status(500).json({ status: "error", message: "Failed to send. Please try again shortly." });
  }
};