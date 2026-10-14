# Portfolio

My personal site. Plain HTML, CSS and JavaScript with no build step, plus a
small Express server for the contact API.

## Running locally

```bash
npm install
npm start        # http://localhost:3000
npm run dev      # restarts on file changes
```

Configuration is optional. Copy `.env.example` to `.env` and fill in the SMTP
settings if you want contact messages emailed to you. Either way they are
saved to `data/messages.json`, which is git-ignored.

## Files

```
index.html          Home page
projects.html       List of all projects
projects/*.html     One page per project
404.html            Not-found page
css/style.css       All styles
js/main.js          Smooth scrolling, nav, work preview, scroll reveals
server.js           Express server: static files + /api/contact
api/contact.js      Serverless version of /api/contact (Vercel)
api/_lib/contact.js Validation and email code shared by both
imgs/icons/stack.svg  Logo sprite from Simple Icons (CC0)
```

## Adding a project

1. Add a row to `projects.html`.
2. Add a work name and preview shot to the work section of `index.html`.
3. Copy a page in `projects/` and update its prev/next links.

## Contact API

There's no form on the site right now (it links to email), but the endpoint
is kept for later.

| Method | Path           | Notes                                      |
| ------ | -------------- | ------------------------------------------ |
| POST   | `/api/contact` | JSON `{ name, email, message }`            |
| GET    | `/api/health`  | Uptime and whether SMTP is set up (Express only) |

The Express server rate limits to 5 messages per IP per 10 minutes, drops
anything that fills the hidden `website` field, stores the message and then
emails it if SMTP is configured.

The serverless version can't store anything, so it returns `503` until SMTP
is configured.

## Deploying to Vercel

Import the repo and deploy with no framework preset or build command.

- `"framework": null` in `vercel.json` stops Vercel from treating the project
  as an Express app.
- `.vercelignore` keeps `server.js` and other private files out of the
  deployment, and `vercel.json` rewrites hide `package.json`.
- The security headers that `server.js` normally sends are set in
  `vercel.json` instead.
- `engines.node` is pinned to `22.x` because Vercel rejects open ranges.

For the contact endpoint to work, set `CONTACT_EMAIL`, `SMTP_HOST`,
`SMTP_USER` and `SMTP_PASS` in the project's environment variables.
