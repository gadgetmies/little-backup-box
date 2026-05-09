# UI pattern system

Rules for how the React webapp lays out a page, and a short rubric for choosing between Card, Accordion, and Tabs. Read this when you add a new section, restructure an existing one, or review someone else's PR.

## Heading scale

The webapp uses three heading levels in user-facing content. h4, h5, h6 are not used.

| Level | Where it comes from | What it names |
| --- | --- | --- |
| **h1** | AppBar (`Menu.jsx`, `getPageTitle()`) | The page itself. Exactly one per page. |
| **h2** | `<SectionHeader level={2}>` | A top-level section of a page. |
| **h3** | `<SectionHeader level={3}>` | A subsection inside a section. |

Pages do **not** render their page title again in the body — the AppBar already does it. If you find yourself adding `<Typography variant="h2">PageName</Typography>` at the top of a page, delete it.

Direct use of `<Typography variant="h2">` / `"h3">` for sectioning is also out — always reach for `<SectionHeader>` so the styling stays consistent and the constraint is enforceable from one place.

## The shared primitives

Two components live in `webapp/src/components/`:

### `<SectionHeader>`

```jsx
<SectionHeader level={2} title="Database operations" icon={<StorageIcon />} action={<Button>Refresh</Button>} />
```

| Prop | Type | Required | Notes |
| --- | --- | --- | --- |
| `level` | `2 \| 3` | yes | Picks the typography variant and semantic element. |
| `title` | string | yes | Section title. Translated by the caller (the primitive doesn't call `t()`). |
| `icon` | ReactNode | no | Optional left-side icon. |
| `action` | ReactNode | no | Optional right-aligned action slot (button, switch, etc.). |

### `<PageSection>`

```jsx
<PageSection variant="card" title="Display" icon={<MonitorIcon />}>
  ...children...
</PageSection>

<PageSection variant="accordion"
             title="Mount"
             localStorageKey="lbb-accordion-storage-mount">
  ...children...
</PageSection>
```

| Prop | Type | Required | Notes |
| --- | --- | --- | --- |
| `variant` | `'plain' \| 'card' \| 'accordion'` | yes | Picks the wrapping element. |
| `title` | string | no for `plain`; required for `card` and `accordion` | Renders an internal `<SectionHeader level={2}>`. Omit if the section deliberately has no title (rare). |
| `icon` | ReactNode | no | Forwarded to the internal `<SectionHeader>`. |
| `localStorageKey` | string | required for `accordion` | Must match `lbb-accordion-<page>-<section>` (see naming below). |
| `defaultExpanded` | boolean | no, default `false` | Only consulted when the localStorage key is unset. |

Pages compose `<PageSection>` for everything that's a section. Pages do **not** import `Card`, `Accordion`, `AccordionSummary`, or `AccordionDetails` directly for sectioning purposes (it's fine to use those primitives *inside* a section's content — e.g., a list-of-cards inside a `PageSection.plain`).

## Card vs Accordion vs Tabs — the rubric

There are exactly three trigger conditions; one and only one applies for each grouping.

### Use `Card` (`PageSection.card`) when…

…the page has **2–4 peer sections of similar weight that the user typically wants visible together** without progressive disclosure.

Example: a settings page where two peer groups (e.g., notifications + profile) are typically tweaked in the same visit and both fit above the fold.

Don't use Card when…
- …the page has only one section (use `PageSection.plain`).
- …a section is rarely needed (use `Accordion`).
- …the page has more than four peers (consider `Tabs` or move some content to a separate page).

### Use `Accordion` (`PageSection.accordion`) when…

…a grouping is **rarely needed**, **destructive**, or the page has **more than four groupings** that would create an excessive scroll.

Examples:
- `/` "Options" accordion — most users start a backup with the prefilled defaults; only some tweak per-run.
- A page with four+ post-backup groupings of rare-but-important actions, each tucked behind its own header until needed.
- `/storage` "Format" — destructive, used once a year per device.

Accordion rules:
- Default to **collapsed**. Override only when the *first* visit should obviously start expanded (rare; nearly always wrong).
- Persist open/closed state in `localStorage` keyed `lbb-accordion-<page>-<section>` (see naming below).
- Keep the body short — accordions hide content, so a 600-line accordion body defeats the purpose. If a section grows beyond a screenful, split it or promote it.

### Use `Tabs` when…

…the page presents **3+ peer panels of the same subject where the user picks exactly one to view at a time**, and stacking them all would mean a long scroll of unrelated content.

Example: `/integrations` has Cloud / Social / Mail. Each panel is a long form; the user typically only configures one at a time; stacking them all would be ~1000 lines of vertical scroll.

Tabs rules:
- **Tab labels are at most three words.** "Cloud", "Social", "Mail" — never "Settings", "Configuration", "Options".
- An optional one-line description above the tab strip can name every available tab when the labels alone do not communicate scope (e.g., when tab labels are translated and might not be self-evident, or when there are 4+ tabs and the rightmost may be off-screen on narrow viewports). For 3 short, English-recognisable labels (Cloud / Social / Mail) the intro is noise — omit it.
- The selected tab persists in `localStorage` under `lbb-tabs-<page>` (e.g., `lbb-tabs-integrations`). The stored value is the tab's **symbolic name** (`'cloud'`, `'database'`), never the numeric index, so reordering or inserting tabs in the React code never silently re-routes a user's saved selection. Pages fall back to the first tab when the persisted value matches no current tab.
- Don't use Tabs for two panels — render them stacked or side-by-side.
- Don't use Tabs to hide complexity inside a single section — that's an Accordion.

## `localStorage` key naming

| Pattern | Example | Used by |
| --- | --- | --- |
| `lbb-accordion-<page>-<section>` | `lbb-accordion-maintenance-database` | `PageSection.accordion` open state |
| `lbb-tabs-<page>` | `lbb-tabs-integrations` | Tabbed page selected-tab |
| `lbb-<feature>-<aspect>` | `lbb-theme`, `lbb-language`, `lbb-view-preferences` | Cross-page per-user state (existing) |

`<page>` is the page's route slug (`backup`, `view`, `maintenance`, `integrations`, `devices`, `storage`, `network`, `system`, `preferences`). `<section>` is the section's stable kebab-case identifier (no spaces, no translation).

When restructuring a page that already had ad-hoc keys (e.g., `accordion-home-options`), rename to the new scheme. Read the legacy key for one release as a back-compat fallback, then delete the fallback in a follow-up change.

## Section structure quick template

A typical page looks like this:

```jsx
import { Stack } from '@mui/material';
import PageSection from '../components/PageSection';
import SectionHeader from '../components/SectionHeader';
import { useLanguage } from '../contexts/LanguageContext';

function MyPage() {
  const { t } = useLanguage();

  return (
    <Stack spacing={3}>
      <PageSection variant="card" title={t('mypage.section_a')}>
        ...content A...
      </PageSection>

      <PageSection variant="accordion"
                   title={t('mypage.section_b')}
                   localStorageKey="lbb-accordion-mypage-section-b">
        ...content B (rare or destructive)...
      </PageSection>
    </Stack>
  );
}
```

For a tabbed page:

```jsx
function ConnectionsPage() {
  const { t } = useLanguage();
  const [tab, setTab] = useTabSelection('lbb-tabs-integrations', 'cloud');

  return (
    <Stack spacing={3}>
      <Tabs value={tab} onChange={(_, v) => setTab(v)}>
        <Tab value="cloud" label={t('integrations.tab.cloud')} />
        <Tab value="social" label={t('integrations.tab.social')} />
        <Tab value="mail" label={t('integrations.tab.mail')} />
      </Tabs>
      {tab === 'cloud' && <CloudConfig />}
      {tab === 'social' && <SocialMediaConfig />}
      {tab === 'mail' && <MailConfig />}
    </Stack>
  );
}
```

## Things that aren't sections

These do **not** use `PageSection`:

- **Overlays / modals** — render via MUI `<Dialog>` or a custom full-window overlay. Example: `/view` "Single view" is a full-window overlay, not a peer section.
- **Top-of-page alerts / toasts** — `<Alert>` and `<Snackbar>` are first-class siblings of the section stack.
- **Page-level toolbars / filter bars** — render above the first section; they configure the page rather than being a section themselves. Example: `/view` FilterBar.
- **Inner cards in a list** — `<Card>` inside list rows is fine; only top-level page sectioning is constrained.

## Why this rubric

Three reasons three reviewers will repeatedly cite when sending a PR back:

1. **Same look = same code.** If two sections look the same, they should be implemented with the same primitive. The catalog and page map name what kind of grouping each section is; the pattern system maps that to the primitive.
2. **Disclosure follows usage.** Cards make peers; Accordions hide rare or destructive things; Tabs gate exclusive views of the same subject. Picking based on use-frequency rather than aesthetics keeps the page predictable.
3. **One source of truth per concern.** AppBar owns h1; `<SectionHeader>` owns h2/h3; `<PageSection>` owns the wrapper. Pages don't reach for raw `<Typography variant="h2">` or raw `<Card>` for sectioning; if they do, the conformance test or review catches it.
