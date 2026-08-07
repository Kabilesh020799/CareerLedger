const assert = require("node:assert/strict");
const test = require("node:test");

const { toReleaseTag } = require("./release-version");

test("creates a GitHub release tag from a stable package version", () => {
  assert.equal(toReleaseTag("1.0.0"), "v1.0.0");
  assert.equal(toReleaseTag("0.12.3"), "v0.12.3");
});

test("rejects versions that cannot be stable release tags", () => {
  for (const version of ["v1.0.0", "1.0", "01.0.0", "1.0.0-rc.1", "latest", undefined]) {
    assert.throws(() => toReleaseTag(version), /MAJOR\.MINOR\.PATCH/);
  }
});
