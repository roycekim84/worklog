const [nodeMajor] = process.versions.node.split('.').map(Number);

if (Number.isNaN(nodeMajor) || nodeMajor < 20) {
  console.error(`\n[worklog] Node.js ${process.versions.node} detected.`);
  console.error('[worklog] Node.js 20+ is required for this project.\n');
  process.exit(1);
}

console.log(`[worklog] Node.js ${process.versions.node} OK`);
