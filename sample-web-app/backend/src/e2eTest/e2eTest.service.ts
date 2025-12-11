import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { runCLI } from 'jest';
import archiver from 'archiver';
import { Injectable } from '@nestjs/common';
import { ServiceError } from './types/e2eTest.types';

type JestReporter = string | [string, Record<string, any>];

@Injectable()
export class E2ETestService {
  /**
   * Executes Jest E2E tests and returns a zip buffer containing HTML & XML reports
   * @return {Promise<Buffer>} Zip file buffer containing generated reports
   * @throws {ServiceError} If tests fail or reports are not generated
   */
  async runE2ETestsAndZip(): Promise<Buffer> {
    const tempReportDir = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-reports-'));
    try {
      const reporters: JestReporter[] = [
        'default',
        ['jest-junit', { outputDirectory: tempReportDir, outputName: 'jest-e2e.xml' }],
        [
          'jest-html-reporter',
          {
            outputPath: path.join(tempReportDir, 'e2e-report.html'),
            includeFailureMsg: true,
            includeSuiteFailure: true,
          },
        ],
      ];
      /** Inline Jest configuration (to avoid jest-e2e.json file reading) */
      const jestConfig = {
        moduleFileExtensions: ['js', 'json', 'ts'],
        rootDir: '.',
        testEnvironment: 'node',
        testRegex: '.e2e-spec.ts$',
        transform: {
          '^.+\\.(t|j)s$': 'ts-jest',
        },
        reporters,
      };
      /** Execute Jest tests */
      const { results } = await runCLI(
        { _: [], $0: 'jest-e2e', config: JSON.stringify(jestConfig), runInBand: true },
        ["."],
      );
      if (!results) this.throwServiceError('No results returned from Jest', 500);
      if (results.numTotalTests === 0) this.throwServiceError('No E2E tests were executed', 422);
      /** Ensure reports exist */
      const htmlReportPath = path.join(tempReportDir, 'e2e-report.html');
      const xmlReportPath = path.join(tempReportDir, 'jest-e2e.xml');
      if (!fs.existsSync(htmlReportPath) || !fs.existsSync(xmlReportPath))
        this.throwServiceError('Reports were not generated correctly', 500);
      /** Create zip file buffer and return */
      return await this.createZipBuffer([htmlReportPath, xmlReportPath]);
    } catch (error: any) {
      // Handle all errors via throwServiceError
      const message = error?.message || String(error) || 'Unknown error';
      const status = error?.status || 500;
      this.throwServiceError(message, status);
    } finally {
      this.cleanupTempFolder(tempReportDir);
    }
  }

  /**
   * Creates a zip buffer containing the provided files
   * @param {string[]} filePaths - Absolute paths to files to include in zip
   * @return {Promise<Buffer>} Buffer of zipped files
   */
  private createZipBuffer(filePaths: string[]): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const archive = archiver('zip', { zlib: { level: 9 } });
      const chunks: Buffer[] = [];
      archive.on('data', (chunk: Buffer) => chunks.push(chunk));
      archive.on('end', () => resolve(Buffer.concat(chunks)));
      archive.on('error', (err: Error) => reject(err));
      filePaths.forEach((file) => archive.file(file, { name: path.basename(file) }));
      archive.finalize();
    });
  }

  /**
   * Deletes a temporary folder safely
   * @param {string} folderPath - Path to folder to remove
   */
  private cleanupTempFolder(folderPath: string): void {
    try {
      if (fs.existsSync(folderPath)) fs.rmSync(folderPath, { recursive: true, force: true });
    } catch (err) {
      console.warn(`Failed to cleanup temporary folder ${folderPath}:`, err);
    }
  }

  /**
   * Throws a structured service error
   * @param {string} message - Error message
   * @param {number} status - HTTP status code (default: 400)
   * @throws {ServiceError}
   */
  private throwServiceError(message: string, status = 500): never {
    throw { message, status } as ServiceError;
  }
}
