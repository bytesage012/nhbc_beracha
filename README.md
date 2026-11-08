# BERACHA 2026 | New Heritage Baptist Church, Ilorin

Vanilla HTML/CSS/JS website, Supabase database, protected operator console, optional on-demand YouTube checker, and Vercel hosting. No cron jobs.

## Important event details
- Official flyer: BERACHA, 11 Hours of Praise, Assembly of Champions.
- Sunday, November 8, 2026: 8:00 AM (WAT).
- Monday, November 9, 2026: 3:00 PM (WAT).
- Venue: Off Unilorin Road, off Stella Maris School, Tanke, Ilorin.
- Featured ministers: Min. Nike Glory, Min. Joy Oyeniyi, Rev'd Dare Dosunmu, Harmony Brass, Min. Pamilerin Bada; also Spring of Life Choir (SOL).
- Flyer includes the handle Newhbcilorin. **Verify the church's actual YouTube channel**. The handle on the flyer may refer to Facebook, not YouTube.
- The two programme times are displayed separately because the flyer does not establish an 11-hour continuous schedule.

## Setup (required before the livestream controls work)
1. Create a Supabase project.
2. In Supabase SQL Editor, run `database/schema.sql`.
3. In Supabase Authentication > Users, create an operator with email and password. Turn off public signup if it is not needed. If email confirmation is enabled, confirm the user before logging in.
4. Copy the operator UUID from Authentication > Users. Run in SQL Editor:
   `insert into public.admin_users(user_id) values ('YOUR_OPERATOR_UUID');`
5. In `js/config.js`, replace `supabaseUrl` and `supabaseAnonKey` with the Supabase Project URL and **publishable/anon** key. Never use a service-role or secret key in browser code.
6. Deploy this folder to Vercel as a static project (Framework Preset: Other; no build command needed). Vercel automatically deploys `api/check-youtube.js` as a serverless function.
7. Set the following Vercel environment variables for the optional YouTube checker: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `YOUTUBE_API_KEY`, `YOUTUBE_CHANNEL_ID`. Redeploy after setting them. These are for the server function only.
8. Enable YouTube Data API v3 for your Google Cloud project. Use a **server-side** API key restricted to the YouTube Data API; don't use browser referrer restrictions for a server key. For stronger restriction, use a dedicated project, quota limits and monitoring. The YouTube `search.list` request costs 100 quota units per check, so click sparingly.
9. Verify `youtubeChannelUrl` and `facebookUrl` in `js/config.js` before sharing. They are not displayed as social links on the public page until verified.
10. Visit `/horizon-11/` and sign in. Paste a YouTube live URL or 11-character video ID, select Live, and save. Visitors see it on the public page within 60 seconds (or on page refresh).

## Operation
- Public page: queries the single Supabase row on initial load, then every 60 seconds while visible. This is database polling, not YouTube polling. It retains the current player if the database temporarily fails.
- Admin: password-based Supabase authentication plus database row-level security. An unlisted route is not a security control.
- YouTube checker: **manual button only**; requires an authenticated approved operator. Finds a live video for the configured channel. The operator must review and click Save to publish. No background checking occurs if the dashboard closes.
- Manual fallback: paste a new video ID, set Live, save. Set Ended when done. The Ended state keeps a recording player if the ID is still present.
- Upcoming: no video iframe until the status becomes Live.
- The embedded player is served by YouTube; viewers may see ads or restrictions imposed by YouTube. Videos must permit embedding.

## Security
- `admin_users` contains the allowlist. Users cannot add themselves because there is no insert policy.
- `livestream` public select policy exposes only broadcast metadata. Only allowlisted authenticated users can update it.
- YouTube key is only in the serverless function environment. Do not put it in `js/config.js`.
- The public anon/publishable Supabase key is designed to be exposed. RLS must remain enabled.
- Do not rely on an unlisted URL to protect the admin page.

## Local development
- Serve the directory with a static server (e.g. `python3 -m http.server 8080`) for the public page. For the `/api/check-youtube` function, run `vercel dev` after linking your Vercel project and configuring environment variables.
- Never open the HTML as `file://` because ES modules require an HTTP server.

## Files
- `index.html`, `css/style.css`, `js/main.js`: public page.
- `horizon-11/index.html`, `css/admin.css`, `js/admin.js`: operator page.
- `js/config.js`, `js/db.js`: configuration and Supabase REST client.
- `api/check-youtube.js`: authenticated on-demand YouTube check.
- `database/schema.sql`: SQL tables, constraints and RLS.
- `assets/`: church logo and supplied flyer.

## Test checklist
1. Visit public page before configuration: placeholder and setup message, no crash.
2. Set Supabase config and verify public page loads Upcoming.
3. Try signing in with a non-allowlisted account: access denied.
4. Sign in as allowlisted operator: dashboard opens.
5. Save a valid ID with Live: public iframe loads on refresh.
6. Save Ended: replay iframe remains available.
7. Paste an invalid ID: rejected.
8. Reload admin page: session restores within the tab.
9. Click YouTube checker with valid server config: finds an active stream, or reports none.
10. Verify on mobile and confirm the event schedule and minister spellings against the official flyer.


## Dashboard-managed YouTube settings (updated)

The `/horizon-11/` dashboard now lets authorized operators save the YouTube @handle, channel ID and YouTube Data API key. The **Get channel ID from handle** button calls YouTube `channels.list` with `forHandle`, then saves the resolved channel ID. **Check channel now** searches for the currently active livestream. Detected videos require an explicit click to populate the public stream form and a separate save to publish.

Run the updated `database/schema.sql` in Supabase SQL Editor, including the `broadcast_settings` table. Configure these **server-only Vercel environment variables**:

- `SUPABASE_URL` and `SUPABASE_ANON_KEY` (same project as the public JS config)
- `SUPABASE_SERVICE_ROLE_KEY` (secret; never place in client-side JavaScript)
- `SETTINGS_ENCRYPTION_KEY` (64 hex characters, generated with `openssl rand -hex 32`; store securely and keep unchanged between deployments)

The YouTube API key is entered in the dashboard and encrypted with AES-256-GCM before storage. Only the authorized server function can decrypt it. It is never sent to visitors. Changing the encryption key will make the previously stored YouTube key unreadable; save a new key from the dashboard afterward. The admin route name is not a security control; authentication and server-side membership checks are mandatory.

For YouTube API keys used server-side, restrict API access to **YouTube Data API v3**. IP address restrictions may be impractical with Vercel's dynamic egress; use quota monitoring and rotate compromised keys. The server function runs on demand, without cron jobs.
