/**
 * Writes a compact per-project Jest summary for PR comments.
 * Uses NX_TASK_TARGET_PROJECT so parallel affected runs do not clobber each other.
 */
class JestPrSummaryReporter {
  onRunComplete(_contexts, results) {
    const fs = require('fs');
    const path = require('path');
    const project = process.env.NX_TASK_TARGET_PROJECT || 'unknown';
    const outDir = path.join(process.cwd(), 'test-results');

    fs.mkdirSync(outDir, { recursive: true });

    const numFailedTests = results.numFailedTests ?? 0;
    const numRuntimeErrorTestSuites = results.numRuntimeErrorTestSuites ?? 0;
    const success = numFailedTests === 0 && numRuntimeErrorTestSuites === 0;

    const payload = {
      project,
      success,
      numFailedTests,
      numPassedTests: results.numPassedTests ?? 0,
      numPendingTests: results.numPendingTests ?? 0,
      numTotalTests: results.numTotalTests ?? 0,
      numRuntimeErrorTestSuites,
      startTime: results.startTime,
      testResults: (results.testResults || []).map((suite) => {
        const assertions = suite.testResults || suite.assertionResults || [];
        const failedAssertions = assertions.filter(
          (assertion) => assertion.status === 'failed',
        );
        const status =
          suite.status ||
          (failedAssertions.length > 0 || (suite.numFailingTests ?? 0) > 0
            ? 'failed'
            : 'passed');

        return {
          name: path.relative(
            process.cwd(),
            suite.testFilePath || suite.name || '',
          ),
          status,
          assertionResults: failedAssertions.slice(0, 25).map((assertion) => ({
            fullName: assertion.fullName,
            status: assertion.status,
            failureMessages: (assertion.failureMessages || [])
              .slice(0, 2)
              .map((message) => String(message).split('\n')[0].slice(0, 300)),
          })),
        };
      }),
    };

    const safeName = project.replace(/[^\w.-]+/g, '_');
    fs.writeFileSync(
      path.join(outDir, `${safeName}.json`),
      JSON.stringify(payload, null, 2),
    );
  }
}

module.exports = JestPrSummaryReporter;
