// Vercel serverless function: confirms a Paystack payment, then emails the reservation to the organiser.
// Needs these Environment Variables in Vercel (see README.md):
//   PAYSTACK_SECRET_KEY, GMAIL_USER, GMAIL_APP_PASSWORD   (optional: OWNER_EMAIL, ALLOWED_ORIGIN)
const nodemailer = require("nodemailer");

const PRICES = { single: 2000, double: 3000 }; // in pesewas (GH₵20 / GH₵30)
const LABELS = {
  single: "Single - GH₵20 (For One Person)",
  double: "Double - GH₵30 (For Two People / Couple)",
};

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
    const reference = String(b.reference || "").trim();
    const name = String(b.name || "").trim();
    const phone = String(b.phone || "").trim();
    const email = String(b.email || "").trim();
    const notes = String(b.notes || "").trim() || "(none)";
    const ticket = String(b.ticket || "");

    if (!reference || !name || !phone || !PRICES[ticket]) return fail(res, 400, "Missing or invalid details");
    if (!process.env.PAYSTACK_SECRET_KEY) return fail(res, 500, "Server is not configured");

    // 1) Ask Paystack whether this payment really happened
    const pr = await fetch("https://api.paystack.co/transaction/verify/" + encodeURIComponent(reference), {
      headers: { Authorization: "Bearer " + process.env.PAYSTACK_SECRET_KEY },
    });
    const pj = await pr.json().catch(() => ({}));
    const d = pj && pj.data;
    if (!pr.ok || !pj.status || !d || d.status !== "success") return fail(res, 402, "Payment was not successful");
    if (d.currency !== "GHS" || d.amount < PRICES[ticket]) return fail(res, 402, "Payment amount does not match the ticket");

    // 2) The payment must belong to THIS person and ticket (stops one payment being reused for other names)
    const cf = (d.metadata && d.metadata.custom_fields) || [];
    const get = (k) => String((cf.find((x) => x.variable_name === k) || {}).value ?? "").trim();
    if (get("full_name") !== name || get("phone") !== phone || get("ticket") !== ticket) {
      return fail(res, 409, "Payment details do not match this reservation");
    }

    // 3) Email the organiser
    const to = process.env.OWNER_EMAIL || "akosahbright01@gmail.com";
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
    });
    const rows = [
      ["Full Name", name],
      ["Phone / WhatsApp Number", phone],
      ["Email", email],
      ["Ticket Type", LABELS[ticket]],
      ["Amount Paid", "GH₵" + (d.amount / 100).toFixed(2)],
      ["Payment Status", "PAID & VERIFIED with Paystack"],
      ["Paystack Reference", reference],
      ["Dietary Needs / Comments", notes],
    ];
    const html =
      "<div style='font-family:Arial,sans-serif;max-width:560px'><h2 style='color:#16245a'>New VERIFIED Ticket Reservation &mdash; LA NOCHE DE HONOR '26</h2>" +
      "<table style='border-collapse:collapse;width:100%'>" +
      rows.map(([k, v]) =>
        "<tr><td style='padding:10px;border:1px solid #dde3f3;background:#f4f6ff;font-weight:bold;width:38%'>" + esc(k) +
        "</td><td style='padding:10px;border:1px solid #dde3f3'>" + esc(v) + "</td></tr>").join("") +
      "</table></div>";
    await transporter.sendMail({
      from: '"LA NOCHE DE HONOR Tickets" <' + process.env.GMAIL_USER + ">",
      to,
      subject: "VERIFIED Ticket: " + name + " - " + (ticket === "double" ? "Double" : "Single"),
      html,
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    return fail(res, 500, "Server error: " + (err && err.message ? err.message : "unknown"));
  }
};
