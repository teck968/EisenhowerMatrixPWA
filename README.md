# Focus Field

A mobile-first Dynamic Eisenhower Matrix. Tasks stay in IndexedDB on the current browser and device. No account, backend, paid service, or runtime network dependency is required.

Try the app: https://teck968.github.io/EisenhowerMatrixPWA/

## Run locally

Install Node.js, then run:

```powershell
$env:PORT=4187; npm start
```

Open http://127.0.0.1:4187. No dependency installation or build is required. Use the same URL and port between visits to retain access to the same browser storage. Opening `index.html` directly is not supported because modules and service workers need an HTTP origin.

Use **Add 10 example tasks** to explore. Each click appends ten new editable tasks without replacing existing tasks. The button remains available in populated workspaces. Examples rotate through 30 scenarios, then use numbered variants with fresh IDs. Each new example gets independently randomized integer importance and urgency ratings from 1 to 10.

## Interaction decisions

- There are ten equal rating bands, labeled 1–10. Task markers sit at band centers, with small offsets when tasks overlap. No 0 or 11 buffer bands are needed.
- The threshold starts at 5 and ranges from 1 to 10. The boundary sits immediately before the matching band. A rating equal to the threshold counts as high. At 1, all active tasks qualify; at 10, only tasks rated 10 in both dimensions qualify.
- **+** decreases the threshold by one, expanding focus. **−** increases it by one, contracting focus. Controls disable at the limits. Ratings never change as a side effect.
- Up to eight dots are spread within a shared rating band. Larger groups have a count badge. Selecting any shared cell opens every task at that coordinate. The full cell is selectable; all tasks also have large controls in the list below.
- The focus list is retained for evaluation and can be hidden. It uses creation order, with ID as a stable tie breaker. This is a provisional display choice, not a second priority ranking.
- Merge uses IDs: newer `updatedAt` wins; equal timestamps keep the local record. It keeps local settings. The import dialog previews additions, replacements, and retained records before confirmation. This policy is provisional for evaluation.
- Restoring a completed task clears `completedAt` and updates `updatedAt`.

## Architecture

- `data.js`: pure rating, classification, import validation, and merge rules.
- `storage.js`: IndexedDB access. State is read and written in one transaction; failed writes leave previous data intact. Transactions read the latest saved state to avoid lost changes across tabs.
- `matrix.js`: rating-band visualization and grouped point selection.
- `app.js`: forms, task actions, list views, portability, and installation controls.
- `sw.js`: versioned offline application shell. Runtime assets are bundled locally.

Native HTML and CSS replace the recommended Chart.js dependency. The matrix is a fixed 10 × 10 grid, and native buttons provide keyboard selection without a canvas accessibility layer. Domain calculations remain separate from rendering.

The IndexedDB database version is 1; exported JSON has `schemaVersion: 1`. Imports validate the complete dataset before any transaction commits. Unknown schema versions are rejected. Future database changes must add explicit, non-destructive migrations in `onupgradeneeded` and corresponding export migrations. Do not delete the database to upgrade it.

## Test

```powershell
npm test
```

The automated tests cover all rating pairs at every threshold, jitter containment, completion/restoration, schema validation, data round trips, merge conflicts, and replacement behavior. See [VERIFICATION.md](VERIFICATION.md) for browser checks and remaining device verification.

## Static deployment

GitHub Pages is deployed automatically by `.github/workflows/pages.yml` after pushes to `main`. The workflow runs tests, builds `dist/`, and publishes only the runtime assets. In the repository Pages settings, the source is GitHub Actions. No backend or repository access is needed to use the published app. To build locally, run `npm run build`. For another static HTTPS host, publish the contents of `dist/`, which contains:

- `index.html`, `styles.css`, `app.js`, `data.js`, `storage.js`, `matrix.js`
- `sw.js`, `manifest.webmanifest`
- `icons/icon.svg`, `icons/icon-192.png`, `icons/icon-512.png`, `icons/apple-touch-icon.png`

All resource paths are relative, including the manifest and service worker scope, so a repository subpath is supported. `server.mjs` is a development convenience; it is not required on the host. Do not expose the development server publicly.

For each deployment that changes application assets, change the `CACHE` version in `sw.js`. The next visit installs a complete new cache in the background. **Update available** activates it and reloads the app when requested. Old application caches are removed after activation; IndexedDB task data is retained. An initial cache failure prevents the new service worker from installing.

On iOS, use Safari → Share → Add to Home Screen. On supported Android browsers, use Install app or the browser menu. Wait for **Ready offline** before disconnecting. A phone cannot access the desktop’s loopback preview; deploy to HTTPS for testing on physical devices.

## Data portability and limits

Use **Export JSON** for backups and transfers. **Import JSON** validates the file and asks for Merge or Replace. Replace removes the current dataset and imports tasks, threshold, and preferences. Export before replacing if you want a backup.

Data stays local unless you export it. Browser data deletion, storage eviction, private browsing, or changing the origin can make data unavailable. Cross-device synchronization is not implemented. Import limits are 25 MB and 20,000 tasks; titles are limited to 200 characters and descriptions to 10,000. Very large datasets have not been performance-qualified for mobile devices.


Example controls are in a collapsed **Example tasks** section near the bottom. Removal requires confirmation and includes active and completed examples. Newly generated examples carry an explicit `isExample` marker that survives editing, export, and import. Newly created personal tasks carry `isExample: false`. Older examples are recognized only when their original example description and a known example title remain intact; older examples with changed titles or descriptions may require individual deletion.


