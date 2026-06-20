const version = process.versions.node;
const [major, minor] = version.split(".").map(Number);

const isSupported =
  (major === 20 && minor >= 19) ||
  major === 22;

if (!isSupported) {
  console.error(`\nUnsupported Node.js version: ${version}`);
  console.error("Cafe Gonku supports Node.js 20.19+ or 22 LTS.");
  console.error("Use an LTS version to avoid Next.js/React streaming runtime issues.");
  console.error("\nRecommended with nvm-windows:");
  console.error("  nvm install 22");
  console.error("  nvm use 22");
  console.error("  node -v\n");
  process.exit(1);
}
