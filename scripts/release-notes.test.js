const assert = require("node:assert/strict");
const test = require("node:test");

const { extractReleaseNotes } = require("./release-notes");

test("extracts only the requested categorized release section", () => {
  const changelog = `# Changelog

## [Unreleased]

## [2.1.0] - 2026-08-07

### Added

- Added application timelines.

### Fixed

- Fixed status history consistency.

## [2.0.0] - 2026-08-06

### Added

- Added authentication.

[2.1.0]: https://example.com/v2.1.0
`;

  assert.equal(
    extractReleaseNotes(changelog, "2.1.0"),
    `### Added

- Added application timelines.

### Fixed

- Fixed status history consistency.`,
  );
});

test("omits changelog comparison-link definitions from release notes", () => {
  const changelog = `# Changelog

## [2.1.0] - 2026-08-07

### Added

- Added application timelines.

[2.1.0]: https://example.com/v2.1.0
`;

  assert.equal(
    extractReleaseNotes(changelog, "2.1.0"),
    "### Added\n\n- Added application timelines.",
  );
});

test("rejects a missing release section", () => {
  assert.throws(
    () => extractReleaseNotes("# Changelog\n\n## [Unreleased]\n", "2.1.0"),
    /missing a \[2\.1\.0\] release section/,
  );
});

test("rejects a release section without categorized entries", () => {
  assert.throws(
    () =>
      extractReleaseNotes(
        "# Changelog\n\n## [2.1.0] - 2026-08-07\n\nNothing yet.\n",
        "2.1.0",
      ),
    /supported category and at least one bullet entry/,
  );
});
