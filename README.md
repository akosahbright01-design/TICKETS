# LA NOCHE DE HONOR '26 — Tickets + Nominations (live site)

Two pages, one email destination (akosahbright01@gmail.com):
- index.html     Ticket reservation form  (your link: https://YOUR-SITE.vercel.app/)
- nominate.html  Award nomination form    (your link: https://YOUR-SITE.vercel.app/nominate.html)
- api/submit.js  Emails every nomination + manual MoMo reservation to your Gmail
- api/verify.js  (Paystack only) checks an online payment with Paystack, then emails you

Nothing else is needed. No third-party form service.

## STEP 1 — Make a Gmail "App password" (2 minutes)
1. Sign in to akosahbright01@gmail.com -> Google Account -> Security -> turn ON 2-Step Verification.
2. Open https://myaccount.google.com/apppasswords , create one named "forms".
3. Copy the 16-letter code (remove spaces). You will paste it into Vercel in Step 3.
   This code lets the site send email from your Gmail. Do not share it with anyone.

## STEP 2 — Put the files on GitHub
1. Unzip this folder on a laptop.
2. github.com -> New repository (e.g. "la-noche-tickets") -> "uploading an existing file".
3. Drag in EVERYTHING: index.html, nominate.html, package.json, README.md and the whole "api" folder
   (the api folder must stay a folder). Click Commit.
(Prefer no GitHub? Install Vercel CLI: `npm i -g vercel`, open this folder in a terminal, run `vercel`.)

## STEP 3 — Deploy on Vercel (same way as your voting site)
1. vercel.com -> Add New -> Project -> import the repo -> Deploy (leave every setting as default).
2. Project -> Settings -> Environment Variables. Add:
     GMAIL_USER          = akosahbright01@gmail.com
     GMAIL_APP_PASSWORD  = the 16-letter code from Step 1
3. Deployments -> ... -> Redeploy (so the variables take effect).

## STEP 4 — Test, then share
1. Open https://YOUR-SITE.vercel.app/ , reserve a ticket with "MTN MoMo", submit.
2. Check the Gmail inbox (and Spam the first time -> "Not spam"). Do the same on /nominate.html.
3. Share the two links (WhatsApp status, class groups, posters/QR code).
Tip: a MoMo reservation email says "NOT yet verified" -> check your MoMo statement, then confirm on WhatsApp.

## OPTIONAL — Online payment with Paystack
1. Paystack dashboard -> Settings -> API Keys. Start with the TEST keys.
2. In Vercel add:  PAYSTACK_SECRET_KEY = sk_test_xxx   (secret key goes ONLY in Vercel)
3. Open index.html (edit on GitHub) and set:  const PAYSTACK_PUBLIC_KEY="pk_test_xxx";
4. Redeploy, make a test payment, confirm you receive a "VERIFIED Ticket" email.
5. For real money switch BOTH to pk_live_ / sk_live_ (Paystack must have approved your business).
Never put sk_... in any page file.

## If something goes wrong
- "Server is not configured"  -> the two Gmail variables are missing; add them and Redeploy.
- "Invalid login" / 535 error  -> wrong App password, or 2-Step Verification is off. Make a new one.
- No email after success      -> check Spam; confirm GMAIL_USER is exactly akosahbright01@gmail.com.
- Form says "Could not send"   -> the visitor sees a "tap here to send it by email instead" link as a backup.
