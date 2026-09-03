# Login and Profile Card — Design QA

Date: 2026-09-02

## Visual truth

- Reference: `C:\Users\ZERIES~1\AppData\Local\Temp\codex-clipboard-87c87359-1357-48f7-a9cb-6c509ba9107c.png`
- The reference is used as a focused visual target for the logged-in Profile Card: pastel glass surface, rounded corners, avatar ring, crown marker, level/EXP bar, three activity stats, gradient profile CTA, and BP/rank tiles.

## Captured implementation evidence

- [Login Card desktop](./login-card-desktop.jpg)
- [Profile Card desktop](./profile-card-desktop.jpg)
- Capture viewport: 960 × 675 CSS px; browser capture output: 1707 × 1200 px; device scale factor: 0.75.
- The capture-only QA shell centered the fixed popover so the full component could be inspected. The production component remains anchored to the top-right Header and switches to a bottom sheet at mobile widths.

## Interaction checks

- Logged-out Header trigger opens the Login Card.
- Login Card contains Email, Password, LINE, Google, signup mode, show/hide password, and Forgot Password controls.
- Forgot Password switches to the reset form and can return to Login.
- Logged-in Profile Card shows the server-backed profile summary and links to `/profile`.
- Escape, backdrop click, close button, focus return, and mobile no-overflow behavior were checked.
- `/profile` redirects unauthenticated users to `/auth/login?message=auth_required`; completed profiles render the real profile page.
- Browser QA routes reported 0 error/warn entries during these checks.

## Deliberate data states

- The QA capture uses a local-only fixture so no account credential or private profile data is transmitted. The fixture route was removed after capture.
- Production profile data comes from the authenticated Supabase server boundary. Avatar fallback uses a Lucide user icon until the user has an avatar.
- Ranking is displayed as “กำลังคำนวณ” when the Ranking query is not available yet. Trophy is an empty state until the Trophy/Badge collection flow is implemented.

Final result: passed
