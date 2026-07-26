#!/usr/bin/env node
/**
 * Build truncated sticky PR comment markdown for Nx coverage / unit-test summaries.
 * Usage:
 *   node tools/ci/pr-reports.mjs coverage [--coverage-dir coverage] [--coverage-base-dir coverage-base] [--out pr-coverage.md] [--no-coverage-ran]
 *   node tools/ci/pr-reports.mjs tests [--results-dir test-results] [--out pr-tests.md] [--no-tests-ran]
 */
import fs from 'node:fs';
import path from 'node:path';

const MAX_CHARS = 60_000;
const COVERAGE_MARKER = '<!-- nx-coverage-report -->';
const TEST_MARKER = '<!-- nx-test-report -->';
const MAX_FILE_ROWS = 8;
const MAX_PROJECTS_WITH_FILES = 12;
const MAX_FAILED_PROJECT_DETAIL = 20;
const MAX_FAILURES_PER_PROJECT = 8;

function parseArgs(argv) {
  const command = argv[2];
  if (command !== 'coverage' && command !== 'tests') {
    console.error(
      'Usage: node tools/ci/pr-reports.mjs <coverage|tests> [options]',
    );
    process.exit(1);
  }

  const args = {
    command,
    coverageDir: 'coverage',
    coverageBaseDir: 'coverage-base',
    resultsDir: 'test-results',
    out: command === 'coverage' ? 'pr-coverage.md' : 'pr-tests.md',
    noCoverageRan: false,
    noTestsRan: false,
  };

  for (let i = 3; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--coverage-dir' && argv[i + 1]) args.coverageDir = argv[++i];
    else if (arg === '--coverage-base-dir' && argv[i + 1])
      args.coverageBaseDir = argv[++i];
    else if (arg === '--results-dir' && argv[i + 1])
      args.resultsDir = argv[++i];
    else if (arg === '--out' && argv[i + 1]) args.out = argv[++i];
    else if (arg === '--no-coverage-ran') args.noCoverageRan = true;
    else if (arg === '--no-tests-ran') args.noTestsRan = true;
  }

  return args;
}

function truncateMarkdown(body) {
  if (body.length <= MAX_CHARS) return body;
  const note = '\n\n_…truncated to fit GitHub comment size limit._\n';
  const budget = MAX_CHARS - note.length;
  let cut = body.slice(0, budget);
  const lastNewline = cut.lastIndexOf('\n');
  if (lastNewline > budget * 0.5) cut = cut.slice(0, lastNewline);
  return `${cut}${note}`;
}

function escapeCell(value) {
  return String(value).replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function formatPct(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return `${Number(value).toFixed(2)}%`;
}

function formatDiff(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${Number(value).toFixed(2)}%`;
}

function walkForFile(root, fileName, results = []) {
  if (!fs.existsSync(root)) return results;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) walkForFile(full, fileName, results);
    else if (entry.isFile() && entry.name === fileName) results.push(full);
  }
  return results;
}

function walkForJson(root, results = []) {
  if (!fs.existsSync(root)) return results;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) walkForJson(full, results);
    else if (entry.isFile() && entry.name.endsWith('.json')) results.push(full);
  }
  return results;
}

function projectKey(summaryPath, coverageRoot) {
  return (
    path
      .relative(coverageRoot, path.dirname(summaryPath))
      .replace(/\\/g, '/')
      .replace(/^\/+/, '') || '.'
  );
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function metricPct(summary, key) {
  const metric = summary?.total?.[key];
  if (!metric || metric.pct === 'Unknown' || Number.isNaN(metric.pct)) return 0;
  return metric.pct;
}

function fileMetrics(summary) {
  const map = new Map();
  if (!summary) return map;
  for (const [key, value] of Object.entries(summary)) {
    if (key === 'total' || !value || typeof value.pct !== 'number') continue;
    map.set(key.replace(/\\/g, '/'), value.pct);
  }
  return map;
}

function shortenPath(filePath) {
  const parts = filePath.replace(/\\/g, '/').split('/');
  return parts.length <= 4 ? parts.join('/') : `…/${parts.slice(-4).join('/')}`;
}

function collectCoverage(coverageDir, coverageBaseDir) {
  const baseByProject = new Map();
  for (const baseFile of walkForFile(
    coverageBaseDir,
    'coverage-summary.json',
  )) {
    const parsed = readJson(baseFile);
    if (parsed)
      baseByProject.set(projectKey(baseFile, coverageBaseDir), parsed);
  }

  const projects = [];
  for (const summaryPath of walkForFile(coverageDir, 'coverage-summary.json')) {
    const summary = readJson(summaryPath);
    if (!summary) continue;
    const projectPath = projectKey(summaryPath, coverageDir);
    const base = baseByProject.get(projectPath) ?? null;
    const statements = metricPct(summary, 'statements');
    const baseStatements = base ? metricPct(base, 'statements') : null;
    const diffStatements =
      baseStatements === null
        ? statements
        : Math.round((statements - baseStatements + Number.EPSILON) * 100) /
          100;

    const currentFiles = fileMetrics(summary);
    const baseFiles = fileMetrics(base);
    const fileRows = [];
    for (const file of new Set([...currentFiles.keys(), ...baseFiles.keys()])) {
      const current = currentFiles.get(file);
      if (current === undefined) continue;
      const basePct = baseFiles.has(file) ? baseFiles.get(file) : null;
      const diff =
        basePct === null
          ? current
          : Math.round((current - basePct + Number.EPSILON) * 100) / 100;
      fileRows.push({ file, statements: current, diffStatements: diff });
    }
    fileRows.sort(
      (a, b) => Math.abs(b.diffStatements) - Math.abs(a.diffStatements),
    );

    projects.push({
      projectPath,
      statements,
      branches: metricPct(summary, 'branches'),
      functions: metricPct(summary, 'functions'),
      lines: metricPct(summary, 'lines'),
      diffStatements,
      fileRows,
    });
  }

  projects.sort(
    (a, b) => Math.abs(b.diffStatements) - Math.abs(a.diffStatements),
  );
  return projects;
}

function formatCoverage({ projects, noCoverageRan }) {
  const lines = [COVERAGE_MARKER, '## Nx coverage', ''];
  if (noCoverageRan) {
    lines.push(
      '_No affected projects with a test target; coverage was not collected._',
      '',
    );
    return truncateMarkdown(lines.join('\n'));
  }
  if (projects.length === 0) {
    lines.push(
      '_No `coverage-summary.json` files found under the coverage folder._',
      '',
    );
    return truncateMarkdown(lines.join('\n'));
  }

  const decreased = projects.filter((p) => p.diffStatements < 0).length;
  const increased = projects.filter((p) => p.diffStatements > 0).length;
  lines.push(
    `**Projects:** ${projects.length} · **Up:** ${increased} · **Down:** ${decreased}`,
    '',
  );
  lines.push('### Project summary', '');
  lines.push(
    '| Project | Statements | Branches | Functions | Lines | Δ statements |',
  );
  lines.push('| --- | ---: | ---: | ---: | ---: | ---: |');
  for (const project of projects) {
    lines.push(
      `| \`${escapeCell(project.projectPath)}\` | ${formatPct(project.statements)} | ` +
        `${formatPct(project.branches)} | ${formatPct(project.functions)} | ` +
        `${formatPct(project.lines)} | ${formatDiff(project.diffStatements)} |`,
    );
  }
  lines.push('');

  const withFiles = projects
    .filter((p) => p.fileRows.some((f) => f.diffStatements !== 0))
    .slice(0, MAX_PROJECTS_WITH_FILES);
  if (withFiles.length > 0) {
    lines.push('### Largest file deltas', '');
    lines.push(
      '_Top changed files per project (by |Δ statements|). Full Istanbul dumps are omitted to stay under GitHub comment limits._',
      '',
    );
    for (const project of withFiles) {
      const rows = project.fileRows
        .filter((f) => f.diffStatements !== 0)
        .slice(0, MAX_FILE_ROWS);
      if (rows.length === 0) continue;
      lines.push(`#### \`${escapeCell(project.projectPath)}\``, '');
      lines.push('| File | Statements | Δ |');
      lines.push('| --- | ---: | ---: |');
      for (const row of rows) {
        lines.push(
          `| \`${escapeCell(shortenPath(row.file))}\` | ${formatPct(row.statements)} | ${formatDiff(row.diffStatements)} |`,
        );
      }
      const omitted =
        project.fileRows.filter((f) => f.diffStatements !== 0).length -
        rows.length;
      if (omitted > 0) lines.push(`| _…and ${omitted} more file(s)_ | | |`);
      lines.push('');
    }
  }

  lines.push(
    '_Generated from Jest `coverage-summary.json` (head vs base when available)._',
    '',
  );
  return truncateMarkdown(lines.join('\n'));
}

function collectTests(resultsDir) {
  const projects = [];
  for (const file of walkForJson(resultsDir)) {
    const raw = readJson(file);
    if (!raw) continue;
    const project = raw.project || path.basename(file, '.json');
    const failedSuites = (raw.testResults ?? [])
      .filter((suite) => suite.status === 'failed')
      .map((suite) => ({
        name: suite.name ?? 'unknown',
        failures: (suite.assertionResults ?? [])
          .filter((a) => a.status === 'failed')
          .map((a) => ({
            fullName: a.fullName ?? 'unnamed',
            message: (a.failureMessages?.[0] ?? '')
              .split('\n')[0]
              ?.slice(0, 200),
          })),
      }));
    projects.push({
      project,
      success: Boolean(raw.success),
      numFailedTests: raw.numFailedTests ?? 0,
      numPassedTests: raw.numPassedTests ?? 0,
      numPendingTests: raw.numPendingTests ?? 0,
      numTotalTests: raw.numTotalTests ?? 0,
      failedSuites,
    });
  }
  projects.sort((a, b) => {
    if (a.success !== b.success) return a.success ? 1 : -1;
    return a.project.localeCompare(b.project);
  });
  return projects;
}

function formatTests({ projects, noTestsRan }) {
  const lines = [TEST_MARKER, '## Nx tests', ''];
  if (noTestsRan) {
    lines.push(
      '_No affected projects with a test target; unit tests were not run._',
      '',
    );
    return truncateMarkdown(lines.join('\n'));
  }
  if (projects.length === 0) {
    lines.push(
      '_No per-project test result JSON found under `test-results/`._',
      '',
    );
    return truncateMarkdown(lines.join('\n'));
  }

  const failedProjects = projects.filter(
    (p) => !p.success || p.numFailedTests > 0,
  );
  const passedProjects = projects.filter(
    (p) => p.success && p.numFailedTests === 0,
  );
  const totalFailed = projects.reduce((sum, p) => sum + p.numFailedTests, 0);
  const totalPassed = projects.reduce((sum, p) => sum + p.numPassedTests, 0);
  const totalPending = projects.reduce((sum, p) => sum + p.numPendingTests, 0);

  lines.push(
    `**Projects:** ${projects.length} · **Passed projects:** ${passedProjects.length} · **Failed projects:** ${failedProjects.length}`,
  );
  lines.push(
    `**Tests:** ${totalPassed} passed · ${totalFailed} failed · ${totalPending} pending`,
    '',
  );
  lines.push('### Project summary', '');
  lines.push('| Project | Result | Passed | Failed | Pending | Total |');
  lines.push('| --- | --- | ---: | ---: | ---: | ---: |');
  for (const project of projects) {
    const result =
      project.success && project.numFailedTests === 0 ? 'pass' : 'fail';
    lines.push(
      `| \`${escapeCell(project.project)}\` | ${result} | ${project.numPassedTests} | ` +
        `${project.numFailedTests} | ${project.numPendingTests} | ${project.numTotalTests} |`,
    );
  }
  lines.push('');

  if (failedProjects.length > 0) {
    lines.push('### Failures', '');
    for (const project of failedProjects.slice(0, MAX_FAILED_PROJECT_DETAIL)) {
      lines.push(`#### \`${escapeCell(project.project)}\``, '');
      const failures = project.failedSuites.flatMap((suite) =>
        suite.failures.map((failure) => ({ suite: suite.name, ...failure })),
      );
      if (failures.length === 0) {
        lines.push('_Project reported failure without assertion details._', '');
        continue;
      }
      for (const failure of failures.slice(0, MAX_FAILURES_PER_PROJECT)) {
        lines.push(`- \`${escapeCell(failure.fullName)}\``);
        if (failure.message) lines.push(`  - ${escapeCell(failure.message)}`);
      }
      const omitted =
        failures.length - Math.min(failures.length, MAX_FAILURES_PER_PROJECT);
      if (omitted > 0) lines.push(`- _…and ${omitted} more failure(s)_`);
      lines.push('');
    }
    if (failedProjects.length > MAX_FAILED_PROJECT_DETAIL) {
      lines.push(
        `_…and ${failedProjects.length - MAX_FAILED_PROJECT_DETAIL} more failed project(s)_`,
        '',
      );
    }
  }

  lines.push(
    '_Generated from per-project Jest summaries under `test-results/`._',
    '',
  );
  return truncateMarkdown(lines.join('\n'));
}

function writeOut(outPath, body) {
  fs.mkdirSync(path.dirname(path.resolve(outPath)), { recursive: true });
  fs.writeFileSync(outPath, body, 'utf8');
  console.log(`Wrote ${path.resolve(outPath)} (${body.length} chars)`);
}

const args = parseArgs(process.argv);
if (args.command === 'coverage') {
  const body = formatCoverage({
    projects: args.noCoverageRan
      ? []
      : collectCoverage(
          path.resolve(args.coverageDir),
          path.resolve(args.coverageBaseDir),
        ),
    noCoverageRan: args.noCoverageRan,
  });
  if (!body.includes(COVERAGE_MARKER))
    throw new Error('Missing coverage marker');
  writeOut(args.out, body);
} else {
  const body = formatTests({
    projects: args.noTestsRan
      ? []
      : collectTests(path.resolve(args.resultsDir)),
    noTestsRan: args.noTestsRan,
  });
  if (!body.includes(TEST_MARKER)) throw new Error('Missing test marker');
  writeOut(args.out, body);
}
