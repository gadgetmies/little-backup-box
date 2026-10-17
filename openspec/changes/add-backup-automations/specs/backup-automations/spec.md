## ADDED Requirements

### Requirement: Automations chain a trigger to jobs and follow-up jobs

The system SHALL let the user define automations. Each automation consists of one trigger and one or more steps. A step runs a job that the existing scripts already provide (backup, thumbnails, database, exif, rename, social, power off). A step either runs when the trigger fires, or after another step finishes with an outcome of success, failure, or always. Steps that follow the same step with the same outcome SHALL run in parallel, except where they use the same storage device; in that case they SHALL run one after another.

#### Scenario: Card offload chain
- **WHEN** an automation has trigger "device inserted (any USB / card)", step 1 "backup inserted card → USB SSD", and steps 2a "generate previews" and 2b "upload previews → cloud" that both follow step 1 on success
- **AND** an SD card is inserted
- **THEN** step 1 runs with the inserted card as the source
- **AND** after step 1 succeeds, steps 2a and 2b start and process only the files step 1 copied

#### Scenario: Failure branch
- **WHEN** step 1 fails
- **THEN** steps that follow step 1 on success are skipped and recorded as skipped
- **AND** steps that follow step 1 on failure or always run

### Requirement: Jobs run through the existing scripts

The automation runner SHALL run under `scripts/`. It SHALL execute jobs by invoking the existing scripts (`backup.py`, `lib_*.py`) with their existing command-line options, and SHALL NOT reimplement their logic. The web backend SHALL only read and write the automation configuration and run state, and request "run now".

#### Scenario: Backup step command line
- **WHEN** a backup step from "inserted card" to "usb" with checksum enabled runs
- **THEN** the runner starts `backup.py` with the same `--SourceName`, `--TargetName` and option flags that the Backup page would send for the same selection

### Requirement: Per-step notifications

Each step SHALL have notification settings for the events start, progress, finish and error. Each event SHALL have its own selection of channels, chosen from Telegram, Matrix, mail and the box display. Progress messages SHALL be throttled to the configured percentage step and to at most one message per minute per channel. A step without explicit settings SHALL use the global defaults.

#### Scenario: Error message
- **WHEN** a step whose error event is set to Telegram and the box display fails
- **THEN** a message naming the automation, the step and the error reason is sent to Telegram and shown on the box display

#### Scenario: Unconfigured channel
- **WHEN** a step selects a channel that is not configured under Connections
- **THEN** the automation overview and chain view show a warning that names the step and the channel, with a link to set it up

### Requirement: Users can verify a chain before it runs

The Automations page SHALL show every automation as a chain, as a left-to-right graph on wide screens and as a numbered vertical list on phones. Every connection SHALL be labelled with its outcome (on success, on failure, always), and every step SHALL show which events notify which channels. A Simulate action SHALL describe in plain language what would happen for a chosen trigger event and outcome, including the messages that would be sent. Simulate SHALL NOT run any job or send any message.

#### Scenario: Simulate a card insert
- **WHEN** the user simulates "an SD card is inserted" for the card offload chain with outcome "everything succeeds"
- **THEN** the page lists the steps in order, shows which steps run in parallel, and lists each message with its channel
- **AND** no command is executed and no message is sent

### Requirement: Run status and history

The system SHALL record every automation run, together with the status, start and end time, and file counts of each step. The Automations page SHALL show the live status of running automations, with progress for each step, and a history of past runs. Opening a past run SHALL show which steps ran, failed or were skipped, and why.

#### Scenario: Skipped step in history
- **WHEN** an upload step was skipped because the box stayed offline longer than the step's wait time
- **THEN** the run's history entry shows that step as skipped with the reason "offline"

### Requirement: Existing default backups are migrated

When the runner first starts on a box without an automation configuration, it SHALL create an enabled "Default backup" automation from the existing default and secondary backup settings. That automation SHALL reproduce the current boot-time behaviour exactly.

#### Scenario: Upgrade keeps behaviour
- **WHEN** a box with default backup "any USB → USB" and secondary backup "USB → cloud:dropbox" is upgraded
- **THEN** after the next boot it runs the same two backups in the same order as before the upgrade
