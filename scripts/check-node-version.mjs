const version = process.versions.node;
const [major, minor] = version.split(".").map(Number);

const isSupported =
  (major === 20 && minor >= 19) ||
  major === 22;

if (!isSupported) {
  console.error(`\nUnsupported Node.js version: ${version}`);
  console.error("Cafe Gonku supports Node.js 20.19+ or 22 LTS.");
  console.error("Use an LTS version to avoid Next.js/React streaming runtime issues.");
  console.error("\nRecommended for this project:");
  console.error("  pnpm dev:node22");
  console.error("\nOr open a Node 22 shell first:");
  console.error("  pnpm node22:shell");
  console.error("  node -v");
  console.error("  pnpm dev\n");
  console.error("If you prefer nvm-windows, install it first, then run:");
  console.error("  nvm install 22");
  console.error("  nvm use 22");
  console.error("  node -v\n");
  process.exit(1);
}
