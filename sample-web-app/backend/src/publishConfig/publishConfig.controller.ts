import type { Response } from 'express';
import { PublishConfigService } from './publishConfig.service';
import { Controller, Get, Res, NotFoundException } from '@nestjs/common';

@Controller('publish-config')
export class PublishConfigController {
  constructor(private readonly publishConfigService: PublishConfigService) {}

  /**
   * Endpoint to download the SAML config.json file
   * @param res Express Response object
   * @returns The config.json file as a downloadable attachment or an error JSON
   */
  @Get()
  async downloadConfig(@Res() res: Response): Promise<Response> {
    try {
      // Retrieve cached saml setting
      const samlSetting = await this.publishConfigService.getSamlSettingFromCache();
      if (!samlSetting) {
        // Throw NotFoundException if cache is empty
        throw new NotFoundException('Saml setting not found in cache or has expired');
      }
      // Generate config file if cache is not empty
      const fileBuffer = await this.publishConfigService.getConfigFile();
      res.set({
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': 'attachment; filename="samlConfig.json"',
        'Content-Length': fileBuffer.length.toString(),
      });
      return res.send(fileBuffer);
    } catch (error: any) {
      const status = error?.status || 500;
      const message = error?.message || 'Something went wrong. Please try again later';
      return res.status(status).json({ message });
    }
  }
}
