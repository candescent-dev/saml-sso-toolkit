import type { Response } from 'express';
import { Controller, Get, Res } from '@nestjs/common';
import { PublicKeyService } from './publicKey.service';

@Controller('public-key')
export class PublicKeyController {
  constructor(private readonly publicKeyService: PublicKeyService) {}

  /**
   * Endpoint to download the public.pem file
   * @param res Express Response object
   * @returns The public.pem file as a downloadable attachment or an error JSON
   */
  @Get()
  downloadPublicKey(@Res() res: Response): Response {
    try {
      const fileBuffer = this.publicKeyService.getPublicKey();
      res.set({
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': 'attachment; filename="public.pem"',
        'Content-Length': fileBuffer.length.toString(),
      });
      return res.send(fileBuffer);
    } catch (error: any) {
      const status = error?.status || 500;
      return res.status(status).json({
        message: error?.message || 'Unknown error occurred',
      });
    }
  }
}
