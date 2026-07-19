const version = process.versions.node;
const [major, minor] = version.split(".").map(Number);

const isSupported = major === 24 && minor >= 15;

if (!isSupported) {
  console.error(`\nUnsupported Node.js version: ${version}`);
  console.error("Cafe Gonku requires Node.js 24.15+ (below 25).\n");
  console.error("Recommended for this project:");
  console.error("  pnpm dev");
  console.error("\nOr open a Node 24 shell first:");
  console.error("  pnpm node24:shell");
  console.error("  node -v");
  console.error("  pnpm dev\n");
  console.error("If you prefer nvm-windows, run:");
  console.error("  nvm install 24.15.0");
  console.error("  nvm use 24.15.0");
  console.error("  node -v\n");
  process.exit(1);
}
