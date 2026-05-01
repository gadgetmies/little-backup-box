# Webapp documentation

This directory holds the structural reference for the Little Backup Box web UI. Three files, read in order:

1. **[feature-catalog.md](feature-catalog.md)** — every user-facing capability the webapp exposes, grouped by user goal. Source of truth for "what does this app do?".
2. **[page-map.md](page-map.md)** — routes, page titles, sidebar order, and the per-page breakdown of which catalog feature lives in which section. Source of truth for "where do I find feature X?" and "what UI pattern does that section use?".
3. **[ui-pattern-system.md](ui-pattern-system.md)** — the rubric for choosing between Card / Accordion / Tabs, the heading scale, the shared `<PageSection>` and `<SectionHeader>` primitives, and naming conventions for accordion `localStorage` keys.

Update all three together when you add, move, or remove a user-facing feature in the same PR as the code change.
