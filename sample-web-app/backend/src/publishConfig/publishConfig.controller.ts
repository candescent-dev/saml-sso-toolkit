import type { Response } from 'express';
import { Controller, Get, Res } from '@nestjs/common';
import { PublishConfigService } from './publishConfig.service';

@Controller('publish-config')
export class PublishConfigController {
  constructor(private readonly publishConfigService: PublishConfigService) {}

  /**
   * Endpoint to download the SAML config.json file
   * @param res Express Response object
   * @returns The config.json file as a downloadable attachment or an error JSON
   */
  @Get()
  downloadConfig(@Res() res: Response): Response {
    try {
      const fileBuffer = this.publishConfigService.getConfigFile();
      res.set({
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': 'attachment; filename="config.json"',
        'Content-Length': fileBuffer.length.toString(),
      });
      return res.send(fileBuffer);
    } catch (error: any) {
      const status = error?.status || 500;
      const message = error?.message || 'Something went wrong. Please try again later';
      return res.status(status).json({ message, status });
    }
  }
}
