const fs = require("node:fs");
const path = require("node:path");

const STABLE_SEMVER_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

function toReleaseTag(version) {
  if (typeof version !== "string" || !STABLE_SEMVER_PATTERN.test(version)) {
    throw new Error(
      "The root package version must use MAJOR.MINOR.PATCH without a leading v, for example 1.0.0.",
    );
  }

  return `v${version}`;
}

function readReleaseTag(packagePath = path.join(__dirname, "..", "package.json")) {
  const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
  return toReleaseTag(packageJson.version);
}

if (require.main === module) {
  try {
    process.stdout.write(`${readReleaseTag()}\n`);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = { readReleaseTag, toReleaseTag };
