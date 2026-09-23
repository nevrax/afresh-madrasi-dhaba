# Repository privacy audit

The cleanup scanned tracked content as UTF-8 and UTF-16, plus the decompressed
payloads of both canonical SWFs. No matches were found for the tested personal-path,
private-address, credential and saved browser/session/device-identifier patterns.
This is a bounded scan, not a guarantee against every possible disclosure.

## Intentionally public information

- Results retain GPU model, browser/driver/kernel versions, graphics backend,
  viewport dimensions and resource use. These describe technical configurations;
  they are not serial numbers or unique browser-instance identifiers.
- Source URLs, publisher/music credits, asset symbol IDs and hashes establish
  provenance. Symbol IDs identify game resources, not people.
- Test tools use temporary target/window IDs through browser APIs. Those calls
  do not contain saved personal browser sessions or profile contents.
- Git metadata separately retains author names and email addresses, including
  contributor identities. A file scan does not anonymize Git history. The cleanup
  does not rewrite authors or already published history.

## Local information

Tool installations, raw traces, screenshots, browser profiles and SSH connection
details belong under ignored `.local-setup/` or local command arguments. Do not
distribute the entire working directory. Both prepared packages exclude local
profiles and development tooling.

## Repeatable check and limits

Run the local Node executable with `tools/documentation-check.mjs`. It examines
tracked and non-ignored working files, reports paths/rule names rather than secret
values, checks local links and compares headline metrics with recorded evidence.
It does not contact remote services or inspect a personal browser.

The check is not general OCR, forensic media analysis, arbitrary secret detection
or independent verification of every cultural source. Cultural and soundtrack
interpretations remain tentative in their reference document. Retain selected
measurement fields rather than copying raw logs into Git.
