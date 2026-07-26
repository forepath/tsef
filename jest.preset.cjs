const path = require('path');
const nxPreset = require('@nx/jest/preset').default;

const reporters = ['default'];

// Emit compact per-project JSON under test-results/ for PR comments (CI only).
if (
  process.env.CI === 'true' ||
  process.env.NX_TASK_TARGET_CONFIGURATION === 'ci'
) {
  reporters.push([
    path.join(__dirname, 'tools/ci/jest-pr-summary-reporter.cjs'),
    {},
  ]);
}

module.exports = {
  ...nxPreset,
  reporters,
};
