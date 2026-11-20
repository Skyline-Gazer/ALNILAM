import fs from "node:fs";
import path from "node:path";

const DOCUMENTS = ["LICENSE", "NOTICE", "CREDITS.md", "THIRD_PARTY_NOTICES.md"];

export function copyDistributionNotices(repositoryRoot, outputRoot) {
  const repository = path.resolve(repositoryRoot);
  const output = path.resolve(outputRoot);
  const assetRoot = path.join(output, "site-assets");
  const assetStat = fs.lstatSync(assetRoot, { throwIfNoEntry: false });
  if (!assetStat?.isDirectory()) {
    throw new Error("Expected a real site-assets directory in the Demo output: " + assetRoot);
  }

  const destination = path.join(assetRoot, "alnilam-notices");
  if (fs.lstatSync(destination, { throwIfNoEntry: false })) {
    throw new Error("Refusing to overwrite an existing Demo asset path: " + destination);
  }
  fs.mkdirSync(destination);

  for (const name of DOCUMENTS) {
    const source = path.join(repository, name);
    const sourceStat = fs.lstatSync(source, { throwIfNoEntry: false });
    if (!sourceStat?.isFile()) {
      throw new Error("Expected a regular canonical notice file: " + source);
    }
    fs.copyFileSync(source, path.join(destination, name), fs.constants.COPYFILE_EXCL);
  }

  const licenseSource = path.join(repository, "LICENSES");
  const licenseStat = fs.lstatSync(licenseSource, { throwIfNoEntry: false });
  if (!licenseStat?.isDirectory()) {
    throw new Error("Expected a real LICENSES directory: " + licenseSource);
  }
  const licenseNames = fs.readdirSync(licenseSource, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".txt"))
    .map((entry) => entry.name)
    .sort();
  if (licenseNames.length === 0) throw new Error("No canonical license text files found in " + licenseSource);

  const destinationLicenses = path.join(destination, "LICENSES");
  fs.mkdirSync(destinationLicenses);
  for (const name of licenseNames) {
    fs.copyFileSync(
      path.join(licenseSource, name),
      path.join(destinationLicenses, name),
      fs.constants.COPYFILE_EXCL,
    );
  }

  return path.relative(output, destination).split(path.sep).join("/");
}
