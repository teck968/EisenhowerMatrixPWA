# Dynamic Eisenhower Matrix — Prototype Requirements

**Version:** 1.1  
**Status:** Interactive prototype specification; updated after design discussion  
**Target:** Offline-capable Progressive Web App (PWA)  
**Primary platform:** Mobile browsers (iOS and Android)  
**Secondary platform:** Desktop browsers

## 1. Project Objective

Develop a mobile-first, offline-capable task management application based on the Eisenhower Matrix.

The application shall allow users to independently rate tasks by importance and urgency on a 1–10 scale and visualize them on a two-dimensional matrix.

The primary distinguishing feature is a dynamically adjustable matrix, where users can expand or contract the high-importance, high-urgency quadrant using a single increment/decrement control.

This allows users to progressively narrow or broaden their focus without modifying the original task ratings.

The application is intended to be intuitive for individuals unfamiliar with the Eisenhower Matrix, including users performing physical work while using a smartphone.

## 2. Scope and Constraints

### 2.1 Required

- Single codebase supporting mobile and desktop browsers.
- Installable Progressive Web App.
- Fully functional offline after initial installation and asset caching.
- No account registration or authentication.
- No backend or application server required for normal operation.
- Local persistent storage.
- Manual data import and export.
- Responsive, touch-friendly interface.
- No paid services or API dependencies.
- No VBA, macros, or platform-specific native application code.

### 2.2 Out of Scope

- Cloud synchronization.
- Multi-user collaboration.
- User accounts.
- Automatic AI-based task prioritization.
- Push notifications.
- Calendar integrations.
- Native iOS or Android application packaging.

The architecture should not unnecessarily prevent these capabilities from being added later.

## 3. Task Management

### FR-001: Task Creation

Users shall be able to create tasks containing:

| Field | Requirement |
| --- | --- |
| Unique ID | Automatically generated |
| Title | Required |
| Description | Optional |
| Importance | Integer from 1 to 10 |
| Urgency | Integer from 1 to 10 |
| Status | Active or Completed |
| Created timestamp | Automatically generated |
| Updated timestamp | Automatically maintained |
| Completed timestamp | Recorded when completed |

Importance and urgency shall be rated independently.

The application shall not require users to understand or select an Eisenhower quadrant when creating tasks.

### FR-002: Task Editing

Users shall be able to modify task titles, descriptions, importance ratings, and urgency ratings.

Changes to importance or urgency shall automatically update the task’s position on the matrix.

### FR-003: Task Completion

Users shall be able to:

- Mark tasks completed.
- View completed tasks separately.
- Restore completed tasks to active status.

Completed tasks shall be excluded from the active matrix by default but retained in persistent storage.

### FR-004: Task Deletion

Users shall be able to delete tasks, with confirmation to prevent accidental deletion.

## 4. Eisenhower Matrix

### FR-005: Coordinate System

The matrix shall use a two-dimensional XY plot with ten equal rating bands on each axis. Labels shall appear at band centers. Task points shall be rendered within their rating bands. No extra bands for 0 or 11 are required.

- Horizontal axis (X): Urgency.
- Vertical axis (Y): Importance.
- Both dimensions shall use a fixed range of 1–10.
- Each active task shall be represented by a plotted point.
- Task coordinates shall correspond to their assigned importance and urgency ratings.

The matrix shall display the four conventional Eisenhower quadrants.

### FR-006: Adjustable Quadrant Boundaries

The matrix shall contain two independently rendered boundary lines:

- Vertical boundary: Urgency threshold.
- Horizontal boundary: Importance threshold.

Both boundaries shall be controlled by one shared numeric threshold value.

The initial shared threshold shall be 5, as selected during the design discussion.

The boundary shall sit immediately before the band matching the threshold. Ratings equal to or above the threshold shall count as high. At threshold 5, bands 1–4 are low and bands 5–10 are high. This supersedes the original proposed 5.5 midpoint convention.

The selected threshold shall persist between application sessions and refreshes.

### FR-007: Threshold Controls

Provide two controls:

- **+** expands the high-importance, high-urgency quadrant.
- **−** contracts the high-importance, high-urgency quadrant.

Each activation shall change the shared threshold by exactly one rating point.

Both boundary lines shall move simultaneously and symmetrically.

For example:

| Action | Threshold |
| --- | --- |
| Initial | 5 |
| Press + | 4 |
| Press + again | 3 |
| Press − | 4 |

The threshold shall range from 1 through 10 inclusive. The relevant control shall be disabled at each limit.

### FR-008: Quadrant Classification

Each active task shall be classified dynamically according to its importance, urgency, and the current threshold.

| Condition | Quadrant |
| --- | --- |
| Importance at or above threshold, urgency at or above threshold | High Importance / High Urgency |
| Importance at or above threshold, urgency below threshold | High Importance / Low Urgency |
| Importance below threshold, urgency at or above threshold | Low Importance / High Urgency |
| Importance below threshold, urgency below threshold | Low Importance / Low Urgency |

The classification shall update immediately when the threshold changes.

**Critical constraint:** Changing the threshold must never modify task importance or urgency ratings.

### FR-009: Overlapping Task Visualization

Tasks with identical or nearly identical coordinates may visually overlap.

The application shall implement visual jitter to distinguish overlapping points.

Requirements:

- Jitter shall affect only rendered positions.
- Original task ratings shall remain unchanged.
- Jitter shall be sufficiently small to preserve the apparent coordinate.
- Jitter shall not cause tasks to appear in an incorrect quadrant.
- Task selection and identification shall remain possible.

### FR-010: Task Identification

Users shall be able to identify and select tasks represented on the matrix.

Selecting a task shall reveal its title, importance, urgency, and status, with access to editing and completion actions.

## 5. Focus and Prioritization

### FR-011: Focus List

The application shall provide a task list corresponding to the current high-importance, high-urgency quadrant.

When the threshold changes, the focus list shall update automatically.

Only active tasks meeting both threshold conditions shall appear in this list.

### FR-012: Progressive Focus Adjustment

The user shall be able to expand or contract the focus quadrant repeatedly.

This operation shall:

1. Adjust the shared threshold.
2. Reposition both quadrant boundaries.
3. Reclassify active tasks.
4. Update the focus list.
5. Preserve all original task ratings.

No task shall be deleted, completed, or modified as a consequence of changing the threshold.

## 6. Persistence and Data Portability

### FR-013: Local Storage

Use IndexedDB for persistent application data.

Persist at minimum:

- All task records.
- Task completion status.
- Current threshold.
- Relevant application preferences.

Changes shall be saved automatically.

Data shall survive ordinary application refreshes, closures, and restarts, subject to browser storage retention policies.

### FR-014: Data Export

Users shall be able to export their complete task dataset and relevant application state to a portable JSON file.

The export shall include a schema version to support future compatibility.

### FR-015: Data Import

Users shall be able to import a previously exported JSON file.

Before importing, the application shall ask whether to:

- **Replace:** Replace existing local data with imported data.
- **Merge:** Combine imported data with existing data.

Import requirements:

- Validate the file format and contents before applying changes.
- Prevent duplicate records during merging using task IDs.
- Define and consistently apply a conflict-resolution policy for matching IDs.
- Reject invalid imports without corrupting existing data.
- Report import results to the user.

Importing shall never silently overwrite existing data.

### FR-016: Cross-Device Portability

The same application shall run on smartphones, tablets, and desktop computers.

Users shall be able to export data from one device and import it on another without requiring a server or account.

Automatic synchronization is not required.

## 7. Progressive Web App Requirements

### FR-017: Installation

The application shall support installation to the home screen on supported iOS and Android devices.

Include:

- Web app manifest.
- Application icons.
- Service worker.
- Appropriate standalone display configuration.

### FR-018: Offline Operation

After the initial successful installation and caching of required resources, all core application functionality shall work without internet connectivity.

This includes:

- Creating tasks.
- Editing tasks.
- Completing tasks.
- Viewing the matrix.
- Adjusting thresholds.
- Viewing the focus list.
- Importing and exporting data, where supported by the browser.

All runtime assets and required libraries shall be available offline.

No network connection shall be required for routine task management.

### FR-019: Updates

The application shall support deployment of updated versions without intentionally erasing locally stored task data.

Service worker updates and application schema changes shall be handled safely.

## 8. User Interface

### FR-020: Mobile-First Design

The interface shall prioritize smartphone usability.

Requirements:

- Touch-friendly controls.
- Readable text without zooming.
- Responsive matrix rendering.
- No requirement for horizontal page scrolling.
- Minimal interaction steps for common actions.
- Usable while standing or moving between physical work locations.

### FR-021: Desktop Compatibility

The same application shall adapt to desktop browser dimensions without requiring a separate implementation.

### FR-022: Interface Consistency

The interface shall provide substantially consistent behavior across iOS, Android, and desktop browsers.

Minor platform-specific visual differences are acceptable.

Core functionality must remain equivalent.

## 9. Technical Architecture

### 9.1 Recommended Technology Stack

| Component | Technology |
| --- | --- |
| Application structure | HTML5 |
| Styling | CSS3 |
| Application logic | JavaScript |
| Matrix visualization | Chart.js |
| Persistent storage | IndexedDB |
| Offline caching | Service Worker |
| Installation metadata | Web App Manifest |
| Data interchange | JSON |
| Hosting | Static HTTPS hosting |

A framework is not required unless the coding agent identifies a clear implementation benefit.

### 9.2 Architecture Requirements

- Separate task data management from visualization logic.
- Separate threshold calculations from chart rendering.
- Avoid dependencies on proprietary services.
- Keep the application deployable as static web assets.
- Support future expansion without requiring substantial restructuring.
- Avoid unnecessary abstraction and infrastructure for the prototype.

### 9.3 Hosting

The application may be deployed using a static hosting provider such as GitHub Pages.

Hosting shall serve the application files only.

User task data shall remain local to the device unless explicitly exported.

## 10. Acceptance Criteria

The prototype shall be considered functionally complete when the following tests pass.

- [ ] User can create a task with independent importance and urgency ratings.
- [ ] Task appears at the correct matrix coordinates.
- [ ] Multiple tasks with identical ratings remain visually distinguishable.
- [ ] User can edit and delete tasks.
- [ ] User can mark tasks completed and restore them.
- [ ] Completed tasks do not appear on the active matrix.
- [ ] Both quadrant boundaries initialize immediately before rating band 5.
- [ ] Pressing + expands the high/high quadrant by one rating point.
- [ ] Pressing − contracts the high/high quadrant by one rating point.
- [ ] Both boundary lines move together.
- [ ] Task ratings remain unchanged when thresholds move.
- [ ] Focus list updates immediately after threshold changes.
- [ ] Threshold setting persists after refresh and restart.
- [ ] Task data persists after refresh and restart.
- [ ] Data can be exported to JSON.
- [ ] Import prompts for Replace or Merge.
- [ ] Invalid imports do not corrupt existing data.
- [ ] Data can be transferred between devices through export/import.
- [ ] Application works offline after required resources have been cached.
- [ ] Application is installable on supported mobile browsers.
- [ ] Core functionality works on desktop and mobile.
- [ ] Application updates preserve existing user data.

## 11. Coding Agent Instructions

1. Review the requirements for contradictions, missing implementation details, and technical feasibility before writing code.
2. Preserve all explicitly defined functional requirements.
3. Do not introduce additional features or architectural complexity without justification.
4. Where requirements are ambiguous, ask for clarification rather than making consequential product decisions.
5. Implement the smallest maintainable solution that satisfies the specification.
6. Keep the application functional without a backend or paid service.
7. Include instructions for local development, testing, building (if applicable), and static hosting deployment.
8. Verify acceptance criteria before declaring the prototype complete.
9. Clearly identify any acceptance criteria that could not be verified, particularly device-specific behavior.

## 12. Design Decisions and Provisional Implementation Choices

The following decisions supersede the initial implementation proposals after the interactive design discussion:

- **Rating bands:** Use ten equal bands labeled 1–10, with task markers centered inside their bands. Extra chart buffer bands for 0 and 11 are unnecessary.
- **Threshold:** Start at 5; allow integer values from 1 through 10. The boundary sits just before its matching band, so equality counts as high.
- **Focus list:** Retain the list in the prototype so the user can judge its value through interaction. No separate task priority ranking has been approved.

The following choices are provisional and documented for evaluation:

- **List ordering:** Show tasks in creation order, with ID as a stable tie breaker.
- **Merge conflicts:** For matching IDs, keep the record with the newer updated timestamp; keep the local record on a tie. Retain local threshold and preferences during merges. Preview the effect before confirmation.
- **Visual jitter:** Use small stable offsets within each rating band. Shared coordinates open a complete task picker; large groups include a count badge. Original ratings and quadrant membership remain unchanged.
- **Visualization technology:** Use native HTML and CSS in place of the recommended Chart.js library. The fixed rating grid and selectable buttons do not require an external chart dependency.
- **Restoration:** Clear the completed timestamp when restoring a task, and maintain the updated timestamp.

The user requested an interactive prototype to evaluate remaining design choices rather than further upfront design questions.

---

End of specification — Version 1.1
