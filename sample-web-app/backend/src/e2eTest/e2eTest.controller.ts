import { Controller, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { E2ETestService } from './e2eTest.service';

/**
 * Controller exposing a single endpoint for running all E2E tests
 * and returning the generated reports as a ZIP file
 */
@Controller('e2e-test')
export class E2ETestController {
  constructor(private readonly e2eTestService: E2ETestService) {}

  /**
   * Runs Jest E2E tests and returns all reports in a single ZIP archive.
   * @param res Express response object used to stream the ZIP file
   */
  @Post()
  async downloadE2EReports(@Res() res: Response) {
    try {
      const zipBuffer = await this.e2eTestService.runE2ETestsAndZip();
      if (!zipBuffer) throw new Error('Failed to generate ZIP');
      // Using @Res() because we need to set custom headers and stream binary content
      res.set({
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename=e2e-reports.zip',
        'Content-Length': zipBuffer.length,
      });
      return res.send(zipBuffer);
    } catch (error: any) {
      const status = error?.status || 500;
      const message = error?.message || 'Something went wrong. Please try again later';
      return res.status(status).json({ message, status });
    }
  }
}
