---
title: Failure KB coverage
slug: /failures/coverage
---

The Failure KB uses the files under `website/data/failures/` as its canonical data source.

The build fails when fewer than 100 canonical 2026 records or fewer than 6 represented source families remain. The scheduled workflow also reports registered and enabled sources, source-check outcomes, record changes, missing version/error/cause/solution fields, status counts, and normalized duplicate-signature groups.

`blocked` sources are reported separately from successful sources. Causes, solutions, or workarounds that are not stated by their cited source remain `unknown`.

The scheduled reports are workflow artifacts and are not committed to Git history.
