# HostAtom + Vercel front-door deployment

This project can run as a normal Next.js Node.js application on HostAtom/Plesk while keeping
`https://arena-badminton.vercel.app` as the public URL. Vercel remains the front door and forwards
requests to the HostAtom origin through the optional `HOSTATOM_ORIGIN_URL` rewrite.

## Important boundary

`ARENA_ENABLE_HOSTATOM_PROXY` is `false` by default, and `HOSTATOM_ORIGIN_URL` is intentionally
empty by default. Do not set either variable on the HostAtom origin. Set both variables only in the
Vercel Production environment after the HostAtom deployment has passed its private-origin smoke
checks. This prevents a rewrite loop and keeps the current Vercel deployment working until the
cutover is deliberate.

The value must be an HTTPS origin only, for example:

```text
https://origin.example-hostname.tld
```

Do not include credentials, a path, a query string, or a fragment in the value.

## HostAtom/Plesk origin checklist

1. Create a Node.js application in Plesk with a stable HTTPS hostname that is not the Vercel URL.
2. Deploy the same Git revision to the origin. Set the Plesk Node.js application's startup file
   to `server.js`, then use the repository's normal dependency/build commands:

   ```text
   npm ci
   npm run build
   ```

   `server.js` is the small production adapter that starts the Next.js request handler on the
   port supplied by Plesk. Do not use `npm run start` as a foreground deployment hook; Plesk
   should own the application process and restart it through the Node.js application controls.

3. Configure the production environment on HostAtom. Keep server-only values server-only:
   `DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, and
   other R2 credentials must not be committed or exposed to the browser.
4. Set `NEXT_PUBLIC_SITE_URL` to the public URL that the browser actually uses. If the Vercel URL
   remains public, keep the Auth callback and cookie assumptions aligned with that URL.
5. Confirm `/api/health`, `/auth/login`, `/profile`, `/lobby`, `/messages`, `/api/media/*`, and
   protected redirects on the HostAtom origin before enabling the front-door rewrite.
6. Test Messenger with two authenticated test accounts. Confirm message insert, read state,
   unread count, Supabase Realtime delivery, session refresh, and authorization boundaries.
7. Test Avatar/Profile Background delivery and the read-only Avatar Preview. The app's private
   R2 media proxy must remain available on the HostAtom origin.

## Vercel cutover checklist

1. Add `ARENA_ENABLE_HOSTATOM_PROXY=true` and `HOSTATOM_ORIGIN_URL` to the Vercel Production
   environment only.
2. Deploy the proxy configuration through the normal Git-connected Vercel flow.
3. Verify the public Vercel URL for pages, API routes, cookies, auth callbacks, media, and
   Messenger Realtime.
4. Keep the previous Vercel deployment available as the rollback target until the HostAtom origin
   has been stable through a normal usage window.

## Rollback

Set `ARENA_ENABLE_HOSTATOM_PROXY=false` (or remove both proxy variables) in the Vercel Production
environment and redeploy the front-door project. With the gate disabled, `next.config.ts` returns no
external rewrite and the existing Vercel-hosted application serves requests normally.
