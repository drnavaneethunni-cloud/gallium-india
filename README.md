# Gallium Filters India

A responsive static website with Gallium branding, 24 filter categories, application filtering, product dialogs, PDF downloads, email enquiries, subtle hero parallax, and a scroll-driven illustrative filter assembly. No dependencies or API keys required. Motion can be paused and respects reduced-motion preferences.

## Run and deploy

- Use Node.js 20 or later.
- `npm test` verifies search behavior and catalogue assets.
- `npm run build` generates `dist/`.
- Serve `dist/` with any static web server. For example: `python3 -m http.server 4173 --directory dist`.
- Push this project to a GitHub repository. Import it in Vercel; `vercel.json` sets build command `npm run build` and output `dist`.

## What is live and what needs data

Category search and application filters work locally. `public/parts.json` is intentionally empty: the supplied brochures contain no verified part-number table. The part search displays an honest fallback linking to https://galliumfilters.com/catalogue and lets visitors request a match. Populate it with approved records using this shape:

```json
[{"partNumber":"APPROVED-GALLIUM-NUMBER","name":"Approved product name","crossReferences":["APPROVED-OEM-NUMBER"]}]
```

The example above is a schema only; do not publish it as a product. Matching ignores spaces and punctuation but requires an exact normalized reference. For a large database, replace the client-side JSON with an approved search API; do not ship private catalogue records in a public JSON file.

Enquiries open a mailto draft to hello@galliumfilters.com; this is not a server-side submission and delivery is not confirmed. Configure an approved India contact and a server-side mail service if direct submissions are required. No analytics or storage of enquiry details are implemented.

## Content and imagery

The 24 category names and product coverage follow the supplied Gallium Product Brochure V2 and Technical & Procurement Brochure. The hero is a crop from the supplied technical brochure. Logo and available category photos come from Gallium's public website. Remaining categories use a decorative filter illustration, not a product photograph. The animated assembly is illustrative, not a technical drawing of a specific part. Validate application selection against equipment requirements.

The older public site differs from the brochures on founding date, network size and contact address; these disputed claims have been omitted. No India address, stock guarantee, pricing, certification, or response-time promise has been invented.

Before launch, confirm the India sales email/contact and final domain, add a canonical URL and sitemap for that domain, review company/legal details, and provide the approved part database if on-site cross-reference matching is required.

## Files

- `public/index.html`: layout and content
- `public/styles.css`: responsive design and assembly illustration
- `public/app.js`: interactions, email draft and scroll animation
- `public/search.mjs`: catalogue search functions
- `public/catalogue.json`: editable category data
- `public/parts.json`: approved part records, currently empty
- `public/downloads/`: supplied brochures

## Verification

Automated tests cover category combinations, missing results, reference normalization and accidental partial-reference matches. Browser QA covers the desktop layout, category search, detail dialog, enquiry prefill and assembly appearance. A separate mobile-device test and real email delivery are not claimed.
