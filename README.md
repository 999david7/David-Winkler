# Portfolio

Personal portfolio site. Plain HTML, CSS and JavaScript on the front end —
no frameworks, no build step, no bundler — with a small hardened Node/Express
API behind the contact form.

## Run it

```bash
npm install
npm start          # http://localhost:3000
npm run dev        # same, with auto-restart on file changes
```

Optional configuration:

```bash
cp .env.example .env
```

Set `CONTACT_EMAIL` to receive form submissions. If you also fill in the SMTP
variables, submissions are emailed to you; either way they're appended to
`data/messages.json` (git-ignored).

## Layout

```
index.html          Home — hero, about, education, work, path, footer
projects.html       Work index — every project as a row
projects/*.html     One detail page per project
404.html            Not-found page
css/style.css       All styles
js/main.js          Smooth section links + the work preview panel
server.js           Express: static site + POST /api/contact
api/contact.js      The same endpoint as a serverless function
favicon.svg         Brand mark
files/resume.pdf    Résumé, linked from the footer
imgs/               Portrait, project images, logos
```

## Front end

The palette is two colours, `#FCFBF8` paper and `#17140F` ink, with muted,
faint and line tones as the ink at 56/34/12% alpha. Type is League Gothic for
display caps, Cormorant Garamond for body text and Shadows Into Light for the
handwritten accents, all from Google Fonts. The nav uses
`mix-blend-mode: difference`; the hero elements rise 14px and fade in over
1.1s, staggered 0.14s. Work names darken and slide on hover, and links
underline from the left.

On wide screens hovering a work name shows that project's image (or its name
as a faint glyph) in the sticky preview panel; under 820px the panel hides.

The Stack section's logos live in one sprite, `imgs/icons/stack.svg`, taken
from [Simple Icons](https://simpleicons.org) (CC0). Each item references a
symbol by id and sets its brand colour with `--brand`.

Project pages are plain static HTML. To add a project, add a row to
`projects.html`, a name and preview shot to the work section of `index.html`,
and a page under `projects/` (copy an existing one and update the prev/next
links).

## Contact API

The site itself links to email (there is no form on the
page), but the API is kept for reuse. A form would post JSON to `api/contact` (a relative path, so it works from any
subdirectory). `server.js` validates it, rate limits to 5 submissions per IP per
10 minutes, checks a honeypot field, stores the message, and optionally emails it.

Only `400`, `422` and `429` are shown inline, because those are the ones the
visitor can act on. Anything else — a `404` because the host has no API, a
`503` because it has no mailer configured, a `5xx`, or no response at all —
means the message has nowhere to go, so the form opens a pre-filled `mailto:`
compose window rather than leaving the visitor at a dead end.

### Deploying statically

The site works as pure static files (GitHub Pages, Netlify, S3): every asset
path is relative and nothing needs a server to render. Only the contact API
needs Node. On a serverless host, `api/contact.js` provides the same endpoint —
set the SMTP variables there, since there's no filesystem to store messages in.

Until those variables are set the endpoint returns `503`, and the form falls
back to `mailto:`. That is the expected state of a fresh deployment, not a
failure.

### Deploying to Vercel

Import the repository and deploy — no framework preset, no build command, no
output directory. `vercel.json` and `.vercelignore` configure the rest:

- `"framework": null` stops Vercel from detecting Express (it's a dependency)
  and trying to run `server.js` as the whole site — which fails with
  "No entrypoint found", since `server.js` is excluded from the upload.
- `api/contact.js` is picked up automatically as a function at `/api/contact`.
- `cleanUrls` serves `/projects`, matching the Express server's behaviour.
- The four security headers `server.js` sends are set as static headers, since
  `server.js` itself never runs on Vercel.
- Everything server-side is kept out of the deployment. Vercel serves the
  repository root, so without this `server.js` would be publicly downloadable —
  the `PRIVATE_PATHS` guard only applies when Express is the host.

`engines.node` is pinned to `22.x`; Vercel rejects open-ended ranges like
`>=18`.

For a working contact form, set `CONTACT_EMAIL`, `SMTP_HOST`, `SMTP_USER` and
`SMTP_PASS` in the project's environment variables, then redeploy.

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/contact` | Submit the contact form. Returns `{ ok: true }`. |
| `GET` | `/api/health` | Uptime and whether SMTP is configured. |
