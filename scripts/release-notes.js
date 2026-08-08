const fs = require("node:fs");
const path = require("node:path");

const STABLE_SEMVER_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const CHANGELOG_HEADING_PATTERN = /^## \[(\d+\.\d+\.\d+)\](?: - \d{4}-\d{2}-\d{2})?\s*$/gm;
const RELEASE_CATEGORY_PATTERN = /^### (Added|Changed|Deprecated|Removed|Fixed|Security)\s*$/m;
const RELEASE_ENTRY_PATTERN = /^- \S.+$/m;

function extractReleaseNotes(changelog, version) {
  if (!STABLE_SEMVER_PATTERN.test(version)) {
    throw new Error("Release notes require a stable MAJOR.MINOR.PATCH version.");
  }

  const sections = [...changelog.matchAll(CHANGELOG_HEADING_PATTERN)];
  const matchingSections = sections.filter((match) => match[1] === version);

  if (matchingSections.length === 0) {
    throw new Error(`CHANGELOG.md is missing a [${version}] release section.`);
  }
  if (matchingSections.length > 1) {
    throw new Error(`CHANGELOG.md contains multiple [${version}] release sections.`);
  }

  const section = matchingSections[0];
  const sectionIndex = sections.indexOf(section);
  const start = section.index + section[0].length;
  const nextSection = sections[sectionIndex + 1]?.index ?? changelog.length;
  const remainingChangelog = changelog.slice(start);
  const linkReferences = remainingChangelog.match(/^\[[^\]]+\]:\s+\S+/m);
  const firstLinkReference =
    linkReferences?.index === undefined
      ? changelog.length
      : start + linkReferences.index;
  const end = Math.min(nextSection, firstLinkReference);
  const notes = changelog.slice(start, end).trim();

  if (!RELEASE_CATEGORY_PATTERN.test(notes) || !RELEASE_ENTRY_PATTERN.test(notes)) {
    throw new Error(
      `CHANGELOG.md [${version}] must contain a supported category and at least one bullet entry.`,
    );
  }

  return notes;
}

function readRootVersion(packagePath = path.join(__dirname, "..", "package.json")) {
  const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
  return packageJson.version;
}

function readReleaseNotes(
  changelogPath = path.join(__dirname, "..", "CHANGELOG.md"),
  packagePath = path.join(__dirname, "..", "package.json"),
) {
  return extractReleaseNotes(
    fs.readFileSync(changelogPath, "utf8"),
    readRootVersion(packagePath),
  );
}

if (require.main === module) {
  try {
    process.stdout.write(`${readReleaseNotes()}\n`);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = { extractReleaseNotes, readReleaseNotes, readRootVersion };
