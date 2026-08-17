---
title: Failure KB coverage
slug: /failures/coverage
---

The Failure KB uses files under `website/data/failures/` as its canonical data source.

The build fails when fewer than 100 canonical 2026 records, fewer than 6 represented source families, fewer than 12 Japanese web records, or fewer than 3 enabled Japanese sources remain.

The scheduled workflow reports source checks, record changes, missing version/error/cause/solution fields, status counts, and normalized duplicate-signature groups. Blocked sources are reported separately. Unknown facts remain `unknown`.
