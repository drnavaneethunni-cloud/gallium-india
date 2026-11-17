# Gallium India — easy upload package

This package contains the complete verified Gallium website in just eight files. Both original brochures, all page previews, fonts, images, source code and tests are included. No runtime dependencies or API keys are needed.

## Upload to the existing GitHub repository

1. Extract `gallium-easy-upload.zip`.
2. Open the extracted folder and select all eight files.
3. In `drnavaneethunni-cloud/gallium-india`, choose **Add file → Upload files**.
4. Drag all eight files into the upload area. They belong at the repository's top level, where `package.json` is located. Do not upload the outer ZIP or nest the files inside another folder.
5. Wait until all uploads finish, then commit the changes. The existing `package.json`, `build.mjs`, `vercel.json` and README are replaced by the new versions. Other existing repository files can remain.

The three `.bin` files are parts of the complete website. Upload all three unchanged. Each is below GitHub's 25 MiB browser-upload limit.

## Build and deployment

The build automatically restores and verifies the complete project, then writes the website to `dist/`. The Vercel configuration specifies `npm run build` and the `dist` output directory. If the repository is connected to Vercel, its normal deployment workflow can build these files.

- Build: `npm run build`
- Run the original seven checks: `npm test`
- Restore the editable original source: `npm run unpack`

Restored source is in `.gallium-build/source/`. Keep the original full-source ZIP for ordinary source editing. Changes to restored files are overwritten when the bundle is unpacked again.

The design, search interface, category filtering, brochure viewer and animations are included. Cross-reference data remains deferred, as agreed. Enquiries open an email draft; they are not server-side submissions.
