# MDS Careers (WordPress plugin)

**STATUS: prepared, NOT installed on the live site.** This plugin lives in
the repository so it can be reviewed before anyone installs it on
`cms.mydigitalsavvy.com`. Installing it on production WordPress requires
the owner's explicit go-ahead — nothing in this repo does that
automatically.

## What it does

- Registers a **Jobs** content type (admin-only, not part of core
  `wp/v2` REST — jobs are only ever exposed through this plugin's own
  `mds-careers/v1/jobs` route, and only published/closed ones).
- Stores **candidate applications** and **white-label partnership
  enquiries** in two dedicated database tables (never post types, never
  reachable through any public REST route).
- Stores résumé uploads in a `.htaccess`-protected folder under
  `wp-content/uploads/mds-careers-private/`, with random filenames and
  signature-verified file types — never a public URL.
- Sends email notifications via `wp_mail()` (using whatever SMTP
  transport is already configured on the site — WP Mail SMTP is already
  active on `cms.mydigitalsavvy.com`) and, if configured, WhatsApp Cloud
  API notifications.
- Gives the owner/HR a Careers menu in wp-admin: Jobs, Applications,
  Partnerships, Settings.

It does not touch any existing plugin, page, post, or the two other
mu-plugins already in this repo (`wordpress/mu-plugins/`). It only
creates its own post type and its own tables.

## Requirements

- WordPress with PHP 7.4+ (the live site's PHP version comfortably
  exceeds this).
- No other plugin dependency — deliberately built without ACF/Secure
  Custom Fields, since neither is currently installed on the live site.

## Installation

1. Upload the `mds-careers` folder to `wp-content/plugins/` on
   `cms.mydigitalsavvy.com` (via Hostinger's File Manager, FTP/SFTP, or
   zip the folder and use **Plugins → Add New → Upload Plugin** in
   wp-admin).
2. Go to **Plugins** in wp-admin and activate **MDS Careers**.
   Activation creates the two database tables and the protected résumé
   upload folder — it does not touch anything else.
3. Go to **Careers → Settings** and fill in:
   - `HIRING_NOTIFICATION_EMAIL`, `HIRING_HR_EMAIL` — who gets notified.
   - **Shared secret** — generate a long random string, paste it here,
     and set the exact same value as `MDS_CAREERS_SECRET` in the
     Next.js project's Vercel environment variables.
   - WhatsApp fields, only if an approved WhatsApp Business Platform
     (Cloud API) number is available (see "WhatsApp" below). Leave them
     blank otherwise — everything else keeps working without them.
4. In the Next.js project (Vercel), set:
   - `WORDPRESS_CAREERS_API_URL` = `https://cms.mydigitalsavvy.com/wp-json`
   - `MDS_CAREERS_SECRET` = the same value entered in step 3.
   Redeploy (or just wait for the next deploy) — no code change is
   needed for this step.
5. Go to **Careers → Jobs** and add the real job postings (or re-create
   the 8 seeded ones here so they become CMS-managed). A job is only
   public once its **Job status** field is set to "Published" *and* it
   has an **Employment type** selected — publishing without an
   employment type is blocked on save (falls back to Draft) rather than
   guessing one.

From that point on, publishing, editing, closing, reopening or
archiving a job happens entirely from **Careers → Jobs** — no Next.js
code change or redeploy required.

## Verifying it after install

- Visit `https://cms.mydigitalsavvy.com/wp-json/mds-careers/v1/jobs` —
  should return a JSON array (empty until you publish a job).
- Submit a real test application on the live Careers page and confirm
  it appears under **Careers → Applications**, the notification email
  arrives, and (if configured) the WhatsApp message arrives. If email
  doesn't arrive, check that **WP Mail SMTP** (already installed) has a
  working sender identity configured — this plugin relies on it rather
  than bundling a second mailer.
- Click **Download résumé** on a test application from wp-admin and
  confirm the file downloads correctly; confirm that fetching the same
  file's URL while logged out (or logged in without the Recruiter/Admin
  capability) is refused.

## WhatsApp notes

Automatic delivery requires a WhatsApp Business Platform (Cloud API)
phone number, access token and phone number ID from Meta. Business-
initiated messages outside an open 24-hour conversation window require
an **approved message template** — without one, delivery is best-effort
(an open session window, or a number registered as a test recipient in
Meta Business Manager). If WhatsApp isn't configured, applications are
still saved and emailed normally, and each application's admin screen
offers a manual click-to-chat (`wa.me`) link as a fallback — that still
requires a person to click Send, it is not automatic delivery.

## Roles

Activation creates a **Recruiter** role that can manage Jobs,
Applications and Partnerships but not the Settings screen (credentials,
shared secret) — that stays restricted to Administrators. Assign the
Recruiter role to HR accounts from **Users → Add New** / **Users → All
Users → Edit**.

## Uninstalling

Deactivating the plugin leaves all data in place (jobs, applications,
partnership enquiries, uploaded résumés) so it can be reactivated
without loss. There is no "delete and wipe data" step included — ask
before removing the database tables or uploaded files if that's ever
needed.
