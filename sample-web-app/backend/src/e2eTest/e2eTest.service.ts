import * as os from 'os';
import { runCLI } from 'jest';
import archiver from 'archiver';
import { join, basename } from 'path';
import type { Cache } from 'cache-manager';
import { existsSync, mkdtempSync, rmSync } from 'fs';
import { Inject, Injectable } from '@nestjs/common';
import { ServiceError } from './types/e2eTest.types';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { SamlSettingData } from '../saml/types/samlSetting.types';

type JestReporter = string | [string, Record<string, any>];

@Injectable()
export class E2ETestService {
  private readonly SAML_SETTING_CACHE_KEY = 'saml_setting';
  // Absolute path where compiled backend exists in packaged ZIP / Docker runtime
  private readonly PACKAGED_BACKEND_DIST_PATH = '/app/backend/dist';

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  /**
   * Retrieve cached saml setting, or undefined if expired.
   */
  async getSamlSettingFromCache(): Promise<SamlSettingData | undefined> {
    return await this.cacheManager.get<SamlSettingData>(this.SAML_SETTING_CACHE_KEY);
  }
  /**
   * Determines whether the service is executing from a packaged (ZIP / Docker) backend runtime
   * @returns true if running from compiled backend output
   */
  private isPackagedBackendRuntime(): boolean {
    return existsSync(this.PACKAGED_BACKEND_DIST_PATH);
  }

  /**
   * Resolves the appropriate Jest root directory based on the current runtime layout
   * - Local / CI: project root (.)
   * - Packaged ZIP / Docker: compiled backend directory
   * @returns Jest rootDir value
   */
  private getJestRootDirectory(): string {
    return this.isPackagedBackendRuntime() ? this.PACKAGED_BACKEND_DIST_PATH : '.';
  }

  /**
   * Executes Jest E2E tests and returns a zip buffer containing HTML & XML reports
   * @return Zip file buffer containing generated reports
   * @throws If tests fail or reports are not generated
   */
  async runE2ETestsAndZip(): Promise<Buffer> {
    const tempReportDir = mkdtempSync(join(os.tmpdir(), 'e2e-reports-'));
    try {
      const reporters: JestReporter[] = [
        'default',
        ['jest-junit', { outputDirectory: tempReportDir, outputName: 'jest-e2e.xml' }],
        [
          'jest-html-reporters',
          {
            publicPath: tempReportDir,
            filename: 'e2e-report.html',
            inlineSource: true,
            expand: true,
            includeConsoleLog: true,
            includeFailureMsg: true,
            includeSuiteFailure: true,
          },
        ],
      ];
      const isPackagedBackendRuntime = this.isPackagedBackendRuntime();
      const jestRootDir = this.getJestRootDirectory();
      /**
       * Inline Jest configuration to avoid filesystem-based config
       * resolution differences across runtime layouts.
       */
      const jestConfig = {
        moduleFileExtensions: ['js', 'json', 'ts'],
        rootDir: jestRootDir,
        testEnvironment: 'node',
        testRegex: '.e2e-spec.(ts|js)$',
        transform: isPackagedBackendRuntime
          ? {} // Compiled JS only (ZIP / Docker)
          : { '^.+\\.(t|j)s$': 'ts-jest' }, // Local / CI
        reporters,
      };
      /** Execute Jest tests */
      const { results } = await runCLI(
        { _: [], $0: 'jest-e2e', config: JSON.stringify(jestConfig), runInBand: true },
        ['.'],
      );
      if (!results) this.throwServiceError('No results returned from Jest', 500);
      if (results.numTotalTests === 0) this.throwServiceError('No E2E tests were executed', 422);
      /** Ensure reports exist */
      const htmlReportPath = join(tempReportDir, 'e2e-report.html');
      const xmlReportPath = join(tempReportDir, 'jest-e2e.xml');
      if (!existsSync(htmlReportPath) || !existsSync(xmlReportPath))
        this.throwServiceError('Reports were not generated correctly', 500);
      /** Create zip file buffer and return */
      return await this.createZipBufferFromDir(tempReportDir);
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
   * Creates a ZIP archive buffer containing all files and subdirectories from the provided directory path
   * @param dirPath - Absolute path to the directory to be archived
   * @returns Promise resolving to a ZIP file buffer
   * @throws If the directory does not exist or archiving fails
   */
  private createZipBufferFromDir(dirPath: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        if (!existsSync(dirPath)) {
          return reject(new Error(`Report directory not found: ${dirPath}`));
        }
        const archive = archiver('zip', { zlib: { level: 9 } });
        const chunks: Buffer[] = [];
        // accumulate zip binary data into memory
        archive.on('data', (chunk: Buffer) => chunks.push(chunk));
        archive.on('end', () => resolve(Buffer.concat(chunks)));
        archive.on('error', (err: Error) => reject(err));
        // add the whole directory contents into the archive root
        archive.directory(dirPath, false);
        // finalize the archive (starts writing)
        archive.finalize();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Deletes a temporary folder safely
   * @param folderPath - Path to folder to remove
   */
  private cleanupTempFolder(folderPath: string): void {
    try {
      if (existsSync(folderPath)) rmSync(folderPath, { recursive: true, force: true });
    } catch (err) {
      console.warn(`Failed to cleanup temporary folder ${folderPath}:`, err);
    }
  }

  /**
   * Throws a structured service error
   * @param message - Error message
   * @param status - HTTP status code (default: 400)
   * @throws ServiceError
   */
  private throwServiceError(message: string, status = 500): never {
    throw { message, status } as ServiceError;
  }
}
