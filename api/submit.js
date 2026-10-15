// Vercel serverless function: emails every nomination / manual-MoMo ticket reservation to the organiser's Gmail.
// Needs these Environment Variables in Vercel (see README.md):
//   GMAIL_USER, GMAIL_APP_PASSWORD   (optional: OWNER_EMAIL, ALLOWED_ORIGIN)
const nodemailer = require("nodemailer");

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const fail = (res, code, error) => res.status(code).json({ ok: false, error });

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN || "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return fail(res, 405, "Method not allowed");

  try {
    const b = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const form = b.form === "nomination" ? "nomination" : "ticket";
    const raw = b.fields;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return fail(res, 400, "Missing details");
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) return fail(res, 500, "Server is not configured");

    // keep only plain text fields, with sensible size limits
    let rows = Object.entries(raw)
      .filter(([k]) => k[0] !== "_")
      .slice(0, 12)
      .map(([k, v]) => [String(k).slice(0, 80), String(v ?? "").slice(0, 1500).trim()]);
    const get = (k) => (rows.find(([x]) => x === k) || [, ""])[1];

    let subject, title;
    if (form === "nomination") {
      if (!get("Nominee Name") || !get("Award Category") || !get("Best Department")) return fail(res, 400, "Missing details");
      subject = "New Nomination: " + get("Nominee Name") + " - " + get("Award Category");
      title = "New Nomination &mdash; 25/26 CoDE NSS Send-Off Dinner Night";
    } else {
      if (!get("Full Name") || !get("Phone / WhatsApp Number") || !get("Ticket Type")) return fail(res, 400, "Missing details");
      // this route is for MANUAL MoMo only: never let the browser claim a payment was verified
      rows = rows.filter(([k]) => !/paystack|payment status|amount paid/i.test(k));
      rows.push(["Payment Status", "MANUAL MoMo - NOT yet verified. Check your MoMo statement before confirming."]);
      const kind = /^double/i.test(get("Ticket Type")) ? "Double" : "Single";
      subject = "New Ticket Reservation (MoMo, to verify): " + get("Full Name") + " - " + kind;
      title = "New Ticket Reservation &mdash; LA NOCHE DE HONOR '26";
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
    });
    const html =
      "<div style='font-family:Arial,sans-serif;max-width:560px'><h2 style='color:#16245a'>" + title + "</h2>" +
      "<table style='border-collapse:collapse;width:100%'>" +
      rows.map(([k, v]) =>
        "<tr><td style='padding:10px;border:1px solid #dde3f3;background:#f4f6ff;font-weight:bold;width:38%'>" + esc(k) +
        "</td><td style='padding:10px;border:1px solid #dde3f3'>" + esc(v) + "</td></tr>").join("") +
      "</table></div>";
    await transporter.sendMail({
      from: '"LA NOCHE DE HONOR Forms" <' + process.env.GMAIL_USER + ">",
      to: process.env.OWNER_EMAIL || "akosahbright01@gmail.com",
      subject,
      html,
      text: rows.map(([k, v]) => k + ": " + v).join("\n"),
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    return fail(res, 500, "Server error: " + (err && err.message ? err.message : "unknown"));
  }
};
