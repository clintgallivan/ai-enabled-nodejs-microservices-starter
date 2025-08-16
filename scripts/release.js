#!/usr/bin/env node
/* eslint-disable no-console */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const MICROSERVICES = ["microservices/email-service", "microservices/token-cleanup"];

function updateVersionToExact(packagePath, exactVersion) {
  const packageJsonPath = path.join(packagePath, "package.json");

  if (!fs.existsSync(packageJsonPath)) {
    console.error(`❌ Package.json not found at ${packageJsonPath}`);
    return false;
  }

  try {
    console.log(`📦 Updating ${packagePath} to v${exactVersion}...`);
    execSync(`cd ${packagePath} && yarn version --new-version ${exactVersion} --no-git-tag-version`, {
      stdio: "pipe",
    });
    console.log(`✅ Updated ${packagePath}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to update ${packagePath}:`, error.message);
    return false;
  }
}

function getPackageVersion(packagePath = ".") {
  const packageJsonPath = path.join(packagePath, "package.json");
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  return packageJson.version;
}

function main() {
  const args = process.argv.slice(2);
  const versionType = args[0];

  if (!versionType || !["patch", "minor", "major"].includes(versionType)) {
    console.error("Usage: node scripts/release.js <patch|minor|major>");
    console.error("Example: node scripts/release.js patch");
    process.exit(1);
  }

  console.log(`🚀 Starting ${versionType} release...`);
  console.log("");

  // Update all package.json files without git operations
  console.log("📦 Updating all package versions...");
  
  // Update main package
  try {
    execSync(`yarn version --${versionType} --no-git-tag-version`, { stdio: "pipe" });
    const newMainVersion = getPackageVersion(".");
    console.log(`✅ Main package updated to v${newMainVersion}`);
  } catch (error) {
    console.error("❌ Failed to update main package:", error.message);
    process.exit(1);
  }

  // Get the new main version and sync all microservices to it
  const newMainVersion = getPackageVersion(".");
  let allSuccess = true;
  const updatedVersions = {};

  for (const microservice of MICROSERVICES) {
    const success = updateVersionToExact(microservice, newMainVersion);
    if (success) {
      updatedVersions[microservice] = getPackageVersion(microservice);
    }
    allSuccess = allSuccess && success;
  }

  if (!allSuccess) {
    console.log("");
    console.log("❌ Some packages failed to update. Please check the errors above.");
    process.exit(1);
  }

  // Create single commit for all version changes
  const mainVersion = getPackageVersion(".");
  console.log("");
  console.log("📝 Creating single commit for all version changes...");
  try {
    execSync("git add .", { stdio: "pipe" });
    execSync(`git commit -m "release: v${mainVersion}"`, { stdio: "pipe" });
    console.log("✅ All version changes committed");
  } catch (error) {
    console.error("❌ Failed to commit changes:", error.message);
    console.log("💡 You can manually commit with: git add . && git commit -m \"release: v" + mainVersion + "\"");
  }

  console.log("");
  console.log("📊 Release Summary:");
  console.log("─".repeat(50));
  console.log(`Main API: v${getPackageVersion(".")}`);

  for (const [microservice, version] of Object.entries(updatedVersions)) {
    const serviceName = microservice.split("/").pop();
    console.log(`${serviceName}: v${version}`);
  }

  console.log("✅ All packages updated successfully!");
  console.log("");
  console.log("Next steps:");
  console.log("1. Push the branch: git push origin HEAD");
  console.log("2. Create a PR or merge to main");
  console.log("3. Tag the release: git tag v" + getPackageVersion("."));
}

main();
