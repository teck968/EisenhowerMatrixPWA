# Prototype verification

Date: 2026-10-19. Scope: local interactive prototype in the Codex browser, plus Node.js domain tests. Physical mobile devices and deployed HTTPS hosting were not available for verification.

## Automated checks

`npm test`: 8 tests passed.

- All 100 rating pairs at each of the 10 thresholds classify correctly without changing ratings.
- Threshold initialization, limits, and band-boundary positions.
- Jitter remains inside rating bands and on the correct side of each boundary.
- Completion and restoration update status and timestamps correctly.
- Complete JSON export/import round trip.
- Rejection of invalid schemas, ratings, timestamps, missing fields, and duplicate IDs.
- Merge deduplication, newer-record conflicts, ties, and preservation of local settings.
- Replace semantics and rejection without mutating existing state.

JavaScript syntax checks passed for application, storage, matrix, and service worker modules. The local server returned HTTP 200 with appropriate content types for the page, scripts, stylesheet, manifest, and installation icons.

## Interactive checks

| Behavior | Result |
| --- | --- |
| Create a task with independent ratings | Passed: importance 10, urgency 1 |
| Render task at its rating bands | Passed: task appeared in the upper-left rating cell |
| Edit ratings and update the matrix | Passed: urgency changed to 2 |
| Distinguish shared coordinates | Passed: two example tasks rendered together and opened a complete picker |
| Open task details from the matrix | Passed |
| Complete a task | Passed: active count decreased and task left the matrix |
| View completed tasks and restore | Passed: task returned to the active matrix |
| Delete confirmation and cancel | Passed: correct task named, cancel retained it |
| Commit deletion | Implemented; not exercised in the interactive check |
| Initial threshold | Passed: 5, with boundary before band 5 |
| Expand and contract focus | Passed: threshold and focus list updated immediately |
| Threshold limits | Passed: expansion disabled at 1, contraction disabled at 10 |
| Focus at threshold 1 | Passed: all eight active example tasks qualified |
| Preserve task ratings during threshold changes | Passed through domain tests and observed unchanged task labels |
| Persist data and threshold after refresh | Passed |
| Persist after a complete browser/device restart | Not verified |
| Export JSON | Passed: downloaded a file containing eight tasks while the local server was stopped |
| Import choice and preview | Passed: Merge and Replace options shown with explicit effects |
| Merge a repeated export | Passed: no duplicate tasks; eight local records retained |
| Invalid import | Passed: rejected before changing the eight saved tasks |
| Replace import | Domain test passed; interactive commit not exercised |
| Cross-device transfer | Format round trip verified locally; physical cross-device transfer not verified |
| Offline reload | Passed with the local development server stopped |
| Offline editing | Passed: edited and saved a task while the server was stopped |
| Other offline operations | Asset caching and local-only paths implemented; not every operation separately exercised offline |
| Mobile-width layout | Passed at a 390 × 844 viewport; document content width equaled viewport content width, with no horizontal overflow |
| Desktop layout | Visually inspected |
| iOS/Android installation and behavior | Manifest, icons, worker, and guidance implemented; physical-device installation not verified |
| Application update preserves data | Passed: applied an offline-cache update and retained eight tasks and threshold 5 |
| Future database migrations | No migration needed yet; upgrade path documented, not a claim of compatibility with an unimplemented future schema |

The prototype is ready for interaction feedback. Full device acceptance remains open. In particular, rating-band readability, matrix selection while doing physical work, and whether the focus list helps should be evaluated by the user.
