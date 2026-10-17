## 0. Design review

- [x] 0.1 Mockups for overview, chain graph, step editor, Simulate, phone layout and live run/history (`mockups/`).
- [ ] 0.2 Review the mockups and the open questions in `design.md` with the maintainer; record the decisions in `design.md`.

## 1. Runner (scripts/)

- [ ] 1.1 `automations.json` schema and loader; include it in settings download/restore (`download-settings.php` and webapp `setup.js` both).
- [ ] 1.2 `lib_automation.py` runner service: event intake (device_inserted via udev, boot, schedule, manual), step scheduling with success/failure/always edges, per-device serialisation.
- [ ] 1.3 `backup.py --run-manifest` / `--from-manifest` and JSON-line progress events; no change to existing CLI behaviour when the flags are absent.
- [ ] 1.4 Notifications via existing `lib_mail`, `lib_socialmedia_*` and `lib_display`, with throttling and global defaults.
- [ ] 1.5 Runs history tables and log files.
- [ ] 1.6 Migration of `conf_BACKUP_DEFAULT_*` into "Default backup"; `backup-autorun.py` delegates to the runner.

## 2. Webapp

- [ ] 2.1 `server/routes/automations.js`: CRUD on the config, run now, runs/history, Check (validation) endpoint; mocks in `mockSystem.js` and `mockApi.js`.
- [ ] 2.2 `/automations` route and sidebar entry; update `webapp/docs/page-map.md` and `feature-catalog.md`.
- [ ] 2.3 Overview page (cards, chain strip, Check banner).
- [ ] 2.4 Chain graph (React Flow + dagre) and step editor panel reusing Backup page controls; phone vertical list + bottom sheet.
- [ ] 2.5 Simulate dialog driven by the same chain model (pure function, unit tested).
- [ ] 2.6 Live run status and history.
- [ ] 2.7 i18n keys in en/de/es/fi/fr; `mobile-overflow.spec.js` covers the new page; new e2e spec for create → simulate → run (mock).

## 3. Later

- [ ] 3.1 Prompt step state: question, choices, default after timeout; answers from web UI, Telegram/Matrix buttons and box hardware buttons.
