/**
 * Simple XML parser utility to extract test results from jest-e2e.xml
 * No external dependencies - uses native DOMParser
 */

export interface TestCase {
  name: string;
  className: string;
  time: number;
  status: 'passed' | 'failed' | 'skipped';
  failureMessage?: string;
}

export interface TestSuite {
  name: string;
  tests: number;
  failures: number;
  errors: number;
  skipped: number;
  time: number;
  testCases: TestCase[];
}

export interface TestResults {
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
export function parseJestXml(xmlContent: string): TestResults {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');

  // Check for parsing errors
  const parserError = xmlDoc.querySelector('parsererror');
  if (parserError) {
    throw new Error('Failed to parse XML content');
  }

  const testsuites = xmlDoc.querySelector('testsuites');
  if (!testsuites) {
    throw new Error('Invalid XML format: testsuites element not found');
  }

  const totalTests = parseInt(testsuites.getAttribute('tests') || '0', 10);
  const totalFailures = parseInt(testsuites.getAttribute('failures') || '0', 10);
  const totalErrors = parseInt(testsuites.getAttribute('errors') || '0', 10);
  const totalSkipped = parseInt(testsuites.getAttribute('skipped') || '0', 10);
  const totalTime = parseFloat(testsuites.getAttribute('time') || '0');

  const testSuites: TestSuite[] = [];
  const suiteElements = xmlDoc.querySelectorAll('testsuite');

  suiteElements.forEach((suite) => {
    const suiteName = suite.getAttribute('name') || 'Unknown Suite';
    const suiteTests = parseInt(suite.getAttribute('tests') || '0', 10);
    const suiteFailures = parseInt(suite.getAttribute('failures') || '0', 10);
    const suiteErrors = parseInt(suite.getAttribute('errors') || '0', 10);
    const suiteSkipped = parseInt(suite.getAttribute('skipped') || '0', 10);
    const suiteTime = parseFloat(suite.getAttribute('time') || '0');

    const testCases: TestCase[] = [];
    const testcaseElements = suite.querySelectorAll('testcase');

    testcaseElements.forEach((testcase) => {
      const name = testcase.getAttribute('name') || 'Unknown Test';
      const className = testcase.getAttribute('classname') || '';
      const time = parseFloat(testcase.getAttribute('time') || '0');

      // Determine status
      let status: 'passed' | 'failed' | 'skipped' = 'passed';
      let failureMessage: string | undefined;

      if (testcase.querySelector('failure')) {
        status = 'failed';
        const failure = testcase.querySelector('failure');
        failureMessage = failure?.textContent || failure?.getAttribute('message') || 'Test failed';
      } else if (testcase.querySelector('skipped')) {
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

