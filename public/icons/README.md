# PWA icons

Icon files are generated from `public/logo.png`. To regenerate after updating the logo:

```bash
node scripts/generate-pwa-icons.mjs
```

This creates `icon-192x192.png`, `icon-512x512.png`, and (for the app) `src/app/icon.png` (favicon). Requires: `npm install -D sharp`.
