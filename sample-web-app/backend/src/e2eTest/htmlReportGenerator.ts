import { readFileSync, writeFileSync } from 'fs';
import { XMLParser } from 'fast-xml-parser';

interface TestCase {
  name: string;
  className: string;
  time: number;
  status: 'passed' | 'failed' | 'skipped';
  failureMessage?: string;
}

interface TestSuite {
  name: string;
  tests: number;
  failures: number;
  errors: number;
  skipped: number;
  time: number;
  testCases: TestCase[];
}

interface TestResults {
  totalTests: number;
  totalFailures: number;
  totalErrors: number;
  totalSkipped: number;
  totalTime: number;
  testSuites: TestSuite[];
}

/**
 * Parses jest-e2e.xml and extracts test results
 */
function parseJestXml(xmlContent: string): TestResults {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
  });
  const result = parser.parse(xmlContent);
  const testsuites = result.testsuites;

  if (!testsuites) {
    throw new Error('Invalid XML format: testsuites element not found');
  }

  const totalTests = parseInt(testsuites['@_tests'] || '0', 10);
  const totalFailures = parseInt(testsuites['@_failures'] || '0', 10);
  const totalErrors = parseInt(testsuites['@_errors'] || '0', 10);
  const totalSkipped = parseInt(testsuites['@_skipped'] || '0', 10);
  const totalTime = parseFloat(testsuites['@_time'] || '0');

  const testSuites: TestSuite[] = [];
  const suites = Array.isArray(testsuites.testsuite) ? testsuites.testsuite : testsuites.testsuite ? [testsuites.testsuite] : [];

  suites.forEach((suite: any) => {
    const suiteName = suite['@_name'] || 'Unknown Suite';
    const suiteTests = parseInt(suite['@_tests'] || '0', 10);
    const suiteFailures = parseInt(suite['@_failures'] || '0', 10);
    const suiteErrors = parseInt(suite['@_errors'] || '0', 10);
    const suiteSkipped = parseInt(suite['@_skipped'] || '0', 10);
    const suiteTime = parseFloat(suite['@_time'] || '0');

    const testCases: TestCase[] = [];
    const testcases = Array.isArray(suite.testcase) ? suite.testcase : suite.testcase ? [suite.testcase] : [];

    testcases.forEach((testcase: any) => {
      const name = testcase['@_name'] || 'Unknown Test';
      const className = testcase['@_classname'] || '';
      const time = parseFloat(testcase['@_time'] || '0');

      let status: 'passed' | 'failed' | 'skipped' = 'passed';
      let failureMessage: string | undefined;

      if (testcase.failure) {
        status = 'failed';
        const failure = Array.isArray(testcase.failure) ? testcase.failure[0] : testcase.failure;
        failureMessage = failure['#text'] || failure['@_message'] || 'Test failed';
      } else if (testcase.skipped) {
        status = 'skipped';
      }

      testCases.push({
        name,
        className,
        time,
        status,
        failureMessage,
      });
    });

    testSuites.push({
      name: suiteName,
      tests: suiteTests,
      failures: suiteFailures,
      errors: suiteErrors,
      skipped: suiteSkipped,
      time: suiteTime,
      testCases,
    });
  });

  return {
    totalTests,
    totalFailures,
    totalErrors,
    totalSkipped,
    totalTime,
    testSuites,
  };
}

/**
 * Formats time in seconds to readable format
 */
function formatTime(seconds: number): string {
  if (seconds < 1) {
    return `${Math.round(seconds * 1000)}ms`;
  }
  return `${seconds.toFixed(2)}s`;
}

/**
 * Escapes HTML special characters
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Generates a custom HTML report from XML test results and writes it to file
 */
export function generateHtmlReport(xmlFilePath: string, outputHtmlPath: string): void {
  const xmlContent = readFileSync(xmlFilePath, 'utf-8');
  const testResults = parseJestXml(xmlContent);

  const passedCount = testResults.totalTests - testResults.totalFailures - testResults.totalErrors - testResults.totalSkipped;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SAML E2E Test Report</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      background-color: #f5f5f5;
      color: #333;
      line-height: 1.6;
      padding: 2rem;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background-color: #fff;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      padding: 2rem;
    }
    h1 {
      font-size: 2rem;
      margin-bottom: 0.5rem;
      color: #1a1a1a;
    }
    .subtitle {
      color: #666;
      margin-bottom: 2rem;
    }
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .summary-card {
      background-color: #f9f9f9;
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      padding: 1rem;
      text-align: center;
    }
    .summary-label {
      font-size: 0.875rem;
      color: #666;
      font-weight: 500;
      margin-bottom: 0.5rem;
    }
    .summary-value {
      font-size: 1.5rem;
      font-weight: bold;
      color: #333;
    }
    .summary-value.success {
      color: #4caf50;
    }
    .summary-value.failed {
      color: #d93025;
    }
    .summary-value.skipped {
      color: #ff9800;
    }
    .table-container {
      overflow-x: auto;
      border: 1px solid #e0e0e0;
      border-radius: 6px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      background-color: #fff;
    }
    thead {
      background-color: #f5f5f5;
      border-bottom: 2px solid #e0e0e0;
    }
    th {
      padding: 0.75rem 1rem;
      text-align: left;
      font-size: 0.875rem;
      font-weight: 600;
      color: #666;
    }
    tbody tr {
      border-bottom: 1px solid #e0e0e0;
    }
    tbody tr:hover {
      background-color: #f9f9f9;
    }
    tbody tr:last-child {
      border-bottom: none;
    }
    td {
      padding: 0.75rem 1rem;
      font-size: 0.875rem;
      color: #333;
    }
    .test-name {
      font-weight: 500;
      margin-bottom: 0.25rem;
    }
    .test-class {
      font-size: 0.75rem;
      color: #999;
      font-style: italic;
    }
    .status-badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 500;
      white-space: nowrap;
    }
    .status-badge.status-passed {
      background-color: #e8f5e9;
      color: #4caf50;
    }
    .status-badge.status-failed {
      background-color: #ffebee;
      color: #d93025;
    }
    .status-badge.status-skipped {
      background-color: #fff3e0;
      color: #ff9800;
    }
    .failure-message {
      font-size: 0.75rem;
      color: #d93025;
      background-color: #ffebee;
      padding: 0.5rem;
      border-radius: 4px;
      word-break: break-word;
      white-space: pre-wrap;
    }
    .no-details {
      color: #999;
      font-style: italic;
    }
    @media (max-width: 768px) {
      body {
        padding: 1rem;
      }
      .container {
        padding: 1rem;
      }
      .summary {
        grid-template-columns: repeat(2, 1fr);
      }
      table {
        min-width: 600px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>SAML E2E Test Report</h1>
    <p class="subtitle">Validation results for SAML configuration</p>

    <div class="summary">
      <div class="summary-card">
        <div class="summary-label">Total Tests</div>
        <div class="summary-value">${testResults.totalTests}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">Passed</div>
        <div class="summary-value success">${passedCount}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">Failed</div>
        <div class="summary-value failed">${testResults.totalFailures + testResults.totalErrors}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">Skipped</div>
        <div class="summary-value skipped">${testResults.totalSkipped}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">Duration</div>
        <div class="summary-value">${formatTime(testResults.totalTime)}</div>
      </div>
    </div>

    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Test Name</th>
            <th>Status</th>
            <th>Time</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          ${testResults.testSuites
            .map((suite) =>
              suite.testCases
                .map(
                  (testCase) => `
            <tr>
              <td>
                <div class="test-name">${escapeHtml(testCase.name)}</div>
                ${testCase.className ? `<div class="test-class">${escapeHtml(testCase.className)}</div>` : ''}
              </td>
              <td>
                <span class="status-badge status-${testCase.status}">
                  ${testCase.status === 'passed' ? '✓ Passed' : testCase.status === 'failed' ? '✗ Failed' : '⊘ Skipped'}
                </span>
              </td>
              <td>${formatTime(testCase.time)}</td>
              <td>
                ${testCase.failureMessage ? `<div class="failure-message">${escapeHtml(testCase.failureMessage)}</div>` : '<span class="no-details">-</span>'}
              </td>
            </tr>
          `
                )
                .join('')
            )
            .join('')}
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>`;

  writeFileSync(outputHtmlPath, html, 'utf-8');
}

