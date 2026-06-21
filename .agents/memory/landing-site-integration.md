---
name: Viber marketing landing site integration
description: How the standalone static Viber marketing site is embedded inside the launchpad React app and how its routes/styles are isolated.
---

# Marketing landing site inside the launchpad

The standalone "Viber · The World Series of Vibecoding" marketing site (originally a
self-contained `index.html` in the `website/` folder of the `kwesi-strydom/viberventures`
GitHub repo) is the front door at route `/`. The launchpad app lives at `/games`,
`/leaderboard`, etc. The old launchpad home page was moved to `/welcome`.

**Why:** The user wanted the marketing site as the public entry point with its nav
linking into the launchpad, while keeping the launchpad app intact.

**How to apply:**
- The landing markup is `client/src/pages/landing.html` (imported `?raw`, rendered via
  `dangerouslySetInnerHTML`); its CSS is `client/src/pages/landing.css`, every selector
  prefixed with `.viber-landing` so it can't clobber the launchpad's global styles.
  If you regenerate the CSS, keep the scoping and namespace any `@keyframes`
  (e.g. `viber-scroll-left`) — global keyframe names collide.
- The landing has its OWN nav + footer, so `Layout.tsx` hides the app Navbar/Footer on `/`
  (`HIDE_NAV_ROUTES` includes `/`).
- Landing-page scripts (sticky nav, mobile menu, reveal observer, countdown, stat
  counters) are ported into a `useEffect` in `LandingPage.tsx`, scoped via a container ref.
- A click handler intercepts unmodified left-clicks on same-page anchors whose `href`
  starts with `/` and routes them via react-router `navigate()` (so `/games` stays in the
  SPA); `#` anchors and external links keep default behavior.
- Images live in `client/public/website/assets/` and are referenced with absolute
  `/website/assets/...` paths (matching the original HTML).
