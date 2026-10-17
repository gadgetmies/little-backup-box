## Why

Little Backup Box can run one fixed chain today: a boot-time default backup (`conf_BACKUP_DEFAULT_SOURCE/TARGET`) and an optional secondary backup (`--SecSourceName/--SecTargetName`). Real field workflows need more:

- When a card is inserted, copy it to the USB SSD.
- When that finishes, generate previews and upload low-resolution versions to the cloud.
- Message the user at the start, the end, along the way, and on any error.

Users also need to *see* such a chain and check that it does what they meant before trusting it with a shoot.

## What Changes

- **Automations.** Each automation is a chain of a trigger and the jobs that follow it. Each job can have follow-up jobs "on success", "on failure" or "always". Sibling jobs run in parallel.
- **Triggers:**
  - *Card / USB device inserted.* This matches by kind, exactly like today's `anyusb` source, so no new device matching is needed.
  - *Box started*, which is today's `@reboot` autorun.
  - *Schedule.*
  - *Job finished* (implicit in the chain).
  - *Run now* from the UI.
- **Jobs.** Jobs are the operations `backup.py` already performs: backup (any source → target with the existing options), generate previews (thumbnails), database sync, EXIF update, rename, social publish, power off. A follow-up job receives the previous run's context, such as "the files this backup copied", so previews and uploads only process new files. Uploading low-resolution previews to a cloud remote is the only candidate new job type (see design, open questions).
- **Notifications per job.** Events: start, progress (every N %), finish, error. Channels: Telegram, Matrix, mail, box display. All channels already exist. Global defaults apply, with per-job overrides.
- **New "Automations" page.** It has an overview of the chains, a chain graph editor with a step panel, a **Simulate** walkthrough in plain language, live run status and run history. Phones get the chain as a vertical step list.
- **Runner.** A device-side runner in `scripts/` (Python, systemd) executes chains independently of any browser. It calls the existing scripts, in line with the CLAUDE.md "script alignment" rule. The web UI edits the automation config and reads run state.
- **Migration.** Existing default/secondary backup settings become an equivalent, enabled "Default backup" automation, so upgraded boxes behave exactly as before.
- **Later, not in the first release:** a *prompt* step state. A job pauses with a question and a default answer after a timeout. It can be answered from the web UI, Telegram/Matrix buttons or the box's hardware buttons.

## Capabilities

### New Capabilities
- `backup-automations`: triggers, chained jobs, per-job notifications, simulation, run history, and migration of the existing default backups.

### Modified Capabilities
<!-- none in this proposal; the /automations sidebar entry is added to `webapp-information-architecture` when the page is implemented (task 2.2) -->

## Impact

- New: `scripts/lib_automation.py` (runner), a udev rule for device events, an automation config file next to `config.cfg`, and a runs table (SQLite).
- `backup.py`: gains optional `--run-manifest` / `--from-manifest` flags (copied files, target, counts) and writes progress events the runner can forward. Existing options and behaviour are unchanged.
- `backup-autorun.py`: hands boot-time work to the runner once a migrated "Default backup" automation exists.
- Webapp: new `/automations` route and page components, `server/routes/automations.js`, i18n keys in all five languages, both mock layers, and docs (`feature-catalog.md`, `page-map.md`).
- The PHP UI is unchanged and keeps working until the rewrite is finished. It does not get an automation editor.
- Mockups: `mockups/*.png` (rendered from the HTML next to them).
