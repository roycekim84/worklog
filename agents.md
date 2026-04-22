# agents.md

## Project

Calendar-based local desktop app for personal freelance work logs.

The app must let the user:
- view a monthly calendar as the main screen
- see whether each date has a record or not
- click a date to read or edit that date's log
- save the log as a Markdown file for that date
- automatically commit and push changes to a Git repository

This is **not** a public consumer app.
This is a **local installable tool** for personal work logging.
Do not optimize for social features, cloud accounts, or public release.

---

## Product Definition

Build a desktop app where the calendar is the center of the experience.
Each day corresponds to one Markdown log file.

Behavior:
- if a selected date has no record, open an empty template for that date
- if a selected date already has a record, load the existing Markdown content for editing
- when the user saves, create or update the corresponding Markdown file
- after saving, automatically run git add, git commit, and optionally git push

The app is intended for use across personal and company PCs, but the data remains inside the user's own Git repository.

---

## Primary Goals

1. Make daily logging extremely fast
2. Make the monthly calendar the main navigation surface
3. Keep each day's record as a readable Markdown file
4. Make Git sync automatic after save
5. Make existing logs easy to detect and revisit from the calendar

---

## Non-Goals

Do not build:
- public user accounts
- shared workspaces
- comments, likes, feeds, collaboration
- cloud-hosted backend for storing logs
- mobile app release
- app store packaging as a first priority
- analytics, ads, or monetization features

---

## Recommended Stack

Default recommendation:
- **Electron** for desktop shell
- **React** for UI
- **TypeScript** everywhere
- **Node.js APIs** in Electron main/preload for file system and Git actions
- **simple-git** or direct child_process Git execution
- local config file for repo settings

Reasoning:
- local file access is essential
- Git operations are core behavior
- installable desktop app is the target
- company use is easier with local-only architecture

Tauri is acceptable as a future optimization, but Electron is preferred for initial implementation speed and lower integration friction.

---

## Core User Flow

### First Launch
- user opens the app
- app asks for Git repo setup
- user either:
  - selects an existing local repo folder, or
  - enters a remote Git repo URL and a local destination folder to clone into
- user chooses branch
- app validates repo access
- app stores this configuration locally
- app opens the main calendar view

### Daily Use
- app opens to current month calendar
- dates with logs are visibly marked
- user clicks a date
- right-side editor panel opens
- existing Markdown is loaded if present
- otherwise a template is shown
- user edits content
- user clicks save
- app writes Markdown file
- app stages and commits the change
- app pushes if auto-push is enabled

---

## Main UI Requirements

### Main Layout
Use a 2-column desktop layout.

Left or center:
- monthly calendar
- month navigation
- today shortcut
- visible status for dates with logs

Right:
- selected date editor panel
- save button
- git sync status
- latest action result or error

### Calendar Requirements
The calendar is the main screen.
It must:
- display current month by default
- support previous/next month navigation
- clearly highlight today
- visibly mark dates that have logs
- allow clicking any date to load that date's entry

Date states:
- no log
- log exists
- selected date
- today

### Editor Panel Requirements
The editor panel must show:
- selected date
- structured input form or markdown-backed fields
- save action
- last saved timestamp if available
- git result status

The editor should feel fast and frictionless.
Avoid modal-heavy flows.

---

## Logging Format

Each date corresponds to a single Markdown file.

Recommended file path pattern:

```text
logs/YYYY/MM/YYYY-MM-DD.md
```

Example:

```text
logs/2026/04/2026-04-22.md
```

### Default Markdown Template

```md
# 2026-04-22

## Project


## Work Log
- 

## Notes


## Next Action
- 
```

The app may use structured fields in the UI, but saving must result in Markdown matching the defined template shape.

---

## Save Rules

### When no file exists
- create the year/month folders if needed
- create the Markdown file for the selected date
- populate it from the template using current editor values

### When file already exists
- update that same Markdown file
- do not create duplicates for the same date

### Same-day editing rule
There is exactly **one Markdown file per date**.
Editing a date means editing that same file.

---

## Git Behavior

### On Save
Run the following sequence:
1. validate repo exists
2. optionally pull or fetch if configured
3. write file changes
4. git add relevant files
5. git commit with generated message
6. git push if auto-push is enabled

### Commit Message
Use a consistent message format.
Default:

```text
worklog: update YYYY-MM-DD
```

If file is newly created, this is still acceptable.
Avoid overcomplicated commit messages.

### Git Error Handling
Handle these gracefully:
- repo not found
- invalid branch
- no remote configured
- authentication failure
- push rejected
- merge/rebase conflict
- detached HEAD

Always surface a human-readable error in the UI.
Do not silently fail.

---

## Repo Setup Requirements

The app must support two setup modes:

### Mode A: Use Existing Local Repo
User selects:
- local folder path
- branch name

App validates:
- folder exists
- folder is a git repo
- branch exists or can be checked out

### Mode B: Clone Remote Repo
User inputs:
- remote Git URL
- local folder destination
- branch name

App performs:
- clone
- checkout branch if needed
- validation after clone

Store the chosen repo config locally for future launches.

---

## Local App Settings

Store settings locally in a config file or app storage.
Minimum settings:
- repo local path
- remote URL if relevant
- branch
- logs root folder (default: `logs/`)
- auto-push enabled/disabled
- optional author name/email override
- preferred Markdown template style if extended later

---

## Detecting Existing Logs

The calendar must reflect whether dates already have records.

Implementation expectation:
- when a month is loaded, scan the corresponding `logs/YYYY/MM/` folder
- detect files matching `YYYY-MM-DD.md`
- mark those dates in the calendar

This detection should be fast.
Do not parse every file body just to know whether a log exists.
Presence of the correctly named file is enough.

---

## Editing Model

Preferred UX:
- user edits structured fields in the app
- app generates Markdown on save

Recommended fields:
- Project
- Work Log
- Notes
- Next Action

Optional future fields:
- time blocks
- tags
- mood/status
- blockers

For MVP, keep it simple.

---

## Security and Privacy Rules

This app is for personal work logging.
It must remain local-first.

Important:
- do not send log contents to external servers
- do not build telemetry by default
- do not upload any data except via the user's own Git remote when saving
- avoid storing secrets in plain text where possible
- never expose tokens in logs or UI

Add a visible warning in the UI:
- do not record confidential company secrets, credentials, internal URLs, or proprietary code

The app should encourage brief work summaries, not sensitive internal dumps.

---

## MVP Scope

Build these first:
- desktop installable app shell
- monthly calendar main screen
- visible date markers for existing logs
- click date to load/create entry
- structured editor panel
- Markdown generation and file save
- Git add/commit/push integration
- repo setup screen
- local config persistence
- basic error handling and status messages

---

## Post-MVP Ideas

Only after MVP works reliably, consider:
- richer markdown preview
- time-block based logging
- search across logs
- monthly summary view
- export to PDF
- multiple repo profiles
- optional manual push mode
- dark mode polish
- release packaging for Windows/macOS

These are lower priority than a stable save-and-commit flow.

---

## Implementation Guidance

### Architecture
Suggested modules:
- `main/` Electron main process
- `preload/` secure bridge APIs
- `renderer/` React UI
- `shared/` shared types and helpers
- `lib/git/` git utilities
- `lib/files/` markdown file IO utilities
- `lib/calendar/` date helpers
- `lib/config/` settings persistence

### Keep Boundaries Clear
- renderer must not directly access Node internals
- preload exposes only safe APIs
- file and Git logic live outside UI components

### Quality Expectations
- TypeScript strict mode preferred
- strong error messages
- no silent background mutation
- predictable save behavior
- avoid clever abstractions early

---

## Suggested File Structure

```text
src/
  main/
    index.ts
    git.ts
    repo.ts
    config.ts
  preload/
    index.ts
  renderer/
    App.tsx
    main.tsx
    components/
      CalendarView.tsx
      EditorPanel.tsx
      RepoSetupDialog.tsx
      StatusBar.tsx
    hooks/
      useCalendarLogs.ts
      useSelectedDate.ts
    pages/
      HomePage.tsx
  shared/
    types.ts
    markdown.ts
    dates.ts
```

---

## Expected Behavior Details

### On App Start
- load config
- validate repo
- if config missing or invalid, show setup flow
- otherwise load current month state

### On Month Change
- rescan visible month for existing log files
- update markers

### On Date Select
- compute expected file path
- if file exists, load and parse into editor fields
- if not, load blank template values

### On Save
- validate input
- write markdown file
- commit changes
- push if enabled
- refresh calendar markers and status

---

## UX Tone

The app should feel:
- calm
- practical
- minimal
- desktop-first
- productivity-oriented

Avoid flashy dashboard behavior.
This is a focused utility.

---

## Release Intent

The initial target is personal/internal use.
Do not spend time on public release workflows before the core logging experience is reliable.

Primary success metric:
- user can open app, click a date, write/edit a log, save, and see it committed to Git with near-zero friction

---

## First Build Order

Implement in this order:

1. desktop shell bootstrapping
2. repo setup and validation
3. month calendar UI
4. log detection for dates
5. date selection and editor panel
6. markdown generation and file save
7. git add/commit/push flow
8. error states and status bar
9. packaging and install test

Do not jump into polish before the full save-to-git loop works.

---

## Final Instruction

When making implementation decisions, prioritize:
1. reliability
2. clarity
3. local-first behavior
4. fast daily usage
5. easy maintenance

If a choice exists between a more clever design and a more reliable design, choose the more reliable design.
