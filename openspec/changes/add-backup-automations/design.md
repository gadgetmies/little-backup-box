## Context

Today the box's automatic behaviour is hard-wired:

- `install-little-backup-box.sh` adds `@reboot sudo python3 backup-autorun.py`.
- `backup-autorun.py` runs `backup.py --SourceName <conf_BACKUP_DEFAULT_SOURCE> --TargetName <…>`, optionally with `--SecSourceName/--SecTargetName` for one chained secondary backup.
- With the `anyusb` source, `backup.py` itself waits for a device to appear.
- Notifications are fixed: a mail report at the end (`lib_mail`), messages on the box display (`lib_display`), and social targets as backup *destinations*.

The user wants:

- **Arbitrary chains:** for example card inserted → copy to SSD → (previews ∥ upload low-res JPGs).
- **Messages:** at start, at finish, during progress and on error, per step.
- **Visual verification:** a clear view of the chains so the user can check the settings are right.
- **Later, prompts:** a job can stop and ask for confirmation.

Decisions already taken with the user:

- "Preview fingerprint" means the existing **preview thumbnail** generation (`backup.py --SourceName thumbnails`).
- "Card inserted" matches **by kind**, the same as today's `anyusb`. No per-card identity matching.
- The **PHP UI stays** until the rewrite is complete. Automations live in `scripts/` so they work regardless of which UI is installed. Only the new UI gets the editor.

## Goals / Non-Goals

**Goals**
- Chains of trigger → jobs → follow-up jobs (on success / on failure / always), with parallel siblings.
- Per-job notification settings over the existing channels, with global defaults.
- A visualisation that lets users verify a chain without running it (graph and Simulate), plus live status and history.
- Zero behaviour change for upgraded boxes (migration).
- Follow the CLAUDE.md "script alignment" rule: execution happens in Python under `scripts/`, and the Node backend only edits config and reads state.

**Non-Goals (first release)**
- Prompts and confirmation steps. The data model reserves the state, but there is no UI or channel plumbing yet.
- Matching specific cards or drives by UUID or label.
- Free-form graph drawing. Layout is automatic.
- An automation editor in the PHP UI.

## Decisions

### 1. Model

```
Automation { id, name, enabled, trigger, steps[] }
Trigger    { kind: device_inserted | boot | schedule | manual,
             device_kind?: any_usb | camera,        # device_inserted
             cron?: "0 2 * * *" }                    # schedule
Step       { id, job, after?: { step, when: success|failure|always },
             conditions?: { min_free_gb?, online_only?, wait_online_min? },
             notify: { start, progress_every_pct, finish, error }   # each → [channels]
           }
Job        { type: backup | thumbnails | database | exif | rename | social | power_off | upload_previews,
             source?: "trigger" | <existing backup source id>, target?, options? }  # reuses backup.py names
```

- Steps with the same `after` run in parallel.
- `source: "trigger"` means "the device that fired the trigger", shown as "Inserted card" in the UI.
- Job, source and target names are the existing `backup.py --SourceName/--TargetName` values, so the runner builds the same command lines the Backup page does.

### 2. Storage and execution
- **Config file.** Automations are stored in `scripts/automations.json`, next to `config.cfg` and included in settings backup/restore. It's JSON, not INI, because the structure is nested.
- **Runner.** `lib_automation.py` runs as a systemd service.
  - It receives device events from a small udev rule (`ACTION=="add", SUBSYSTEM=="block"` → `lib_automation.py --event device_inserted --dev %k`), boot and schedule events, and "run now" requests from the web backend.
  - It starts steps by invoking `backup.py` and the other existing scripts with their existing CLIs.
- **Context passing.** `backup.py` gains an optional `--run-manifest <path>` that writes the list of copied files, the target mount point and counts. The next step receives `--from-manifest <path>`, so previews and uploads touch only the new files.
- **Progress.** `backup.py` already computes progress for the display. It additionally appends JSON-line events to the run's event file, and the runner turns these into throttled notifications.
- **Concurrency.** Steps that touch the same device are serialised; independent devices run in parallel. Starting an automation while a manual backup runs is queued, not stop-the-world as on the Backup page.
- **Run history.** Runs are stored in SQLite (`runs`, `run_steps`) with status, timestamps, counts and log path. The web UI reads them through `server/routes/automations.js`.

### 3. Notifications
- Channels are the ones already configured under Connections: Telegram, Matrix, mail, and the box display.
- A channel that is selected but not configured is a **Check** warning, shown on the overview and the graph, never a silent failure.
- Progress is throttled to the chosen step (25 % by default) and to at most one message a minute per channel.

### 4. Visualisation (see `mockups/`)

| Mockup | Purpose |
| --- | --- |
| `01-overview.png` | Every automation as a card: one-line chain strip, last run, enabled switch, Simulate/Edit, plus a "needs attention" banner from Check. |
| `02-chain-graph.png` | Left-to-right graph: trigger node, job nodes, edges labelled ✓ on success / ✗ on failure, bells for notification events, "+" to add follow-ups. Automatic (dagre/ELK-style) layout. |
| `03-step-editor.png` | Side panel per step: *What* (reuses the Backup page controls), *Only if* (conditions), *Notify me* (event × channel grid, unconfigured channels greyed with a link), *Then* (follow-ups). |
| `04-simulate.png` | Pick an event and see a numbered plain-language walkthrough, the exact messages that would be sent, and what happens on failure. Nothing runs. This is the main "verify my settings" tool. |
| `05-mobile.png` | Phones: the graph becomes a numbered vertical list; the step editor is a bottom sheet; the notification grid becomes one row per event. |
| `06-run-and-history.png` | Live run with status per step, history list, and the **future** prompt card (question, choices, default after timeout). |

- **Graph library.** React Flow (`@xyflow/react`) for rendering and dagre for layout, read-only positioning. The vertical phone list is a plain MUI component that renders the same chain model.
- **Pattern system.** All screens follow `webapp/docs/ui-pattern-system.md`: `PageSection`/`SectionHeader`, h2/h3 only, 44 px targets, the warning icon on destructive actions, and no horizontal overflow (covered by `mobile-overflow.spec.js`).

### 5. Migration
On first start of the runner, if `automations.json` doesn't exist, it creates "Default backup" from the current settings:
- trigger `boot`, with source `anyusb` waiting for a device as today;
- step 1 = default backup;
- step 2 (after success) = secondary backup, if configured.

`backup-autorun.py` then delegates to the runner instead of calling `backup.py` directly.

## Risks / Trade-offs
- **Two writers to the same disks** (manual Backup page and automations). Mitigation: the runner's per-device queue, and the Backup page shows "queued behind automation X".
- **udev events and the existing `anyusb` wait loop could both fire.** Mitigation: the runner owns device events once any `device_inserted` automation is enabled; the boot trigger keeps today's behaviour.
- **Notification spam.** Mitigation: throttling and sensible defaults (errors only).
- **React Flow bundle size** (about 50 kB gzip). Acceptable; the library is loaded only on `/automations`.

## Open Questions
1. **Upload low-resolution previews to a cloud remote.** This is the only job without a `backup.py` equivalent today. Options:
   - (a) a new `backup.py --SourceName previews --TargetName cloud:<remote>` mode that uploads `tims/` JPGs; or
   - (b) reuse the social-media upload path with a cloud target.
   Option (a) keeps it in the backup engine.
2. **Schedule triggers.** Should they also be offered in the PHP UI's lifetime, or wait for the new UI only? The proposal assumes new UI only.
3. **Default notification channel for new steps.** "Errors → every configured channel" is suggested.
