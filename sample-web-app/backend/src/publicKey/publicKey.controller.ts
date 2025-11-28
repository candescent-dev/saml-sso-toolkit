import { Controller, Get, Res, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { PublicKeyService } from './publicKey.service';

@Controller('public-key')
export class PublicKeyController {
  constructor(private readonly publicKeyService: PublicKeyService) {}

  @Get()
  async downloadPublicKey(@Res() res: Response): Promise<Response> {
    try {
      const fileBuffer = this.publicKeyService.getPublicKey();
      res.set({
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': 'attachment; filename="public.pem"',
        'Content-Length': fileBuffer.length.toString(),
      });
      return res.send(fileBuffer);
    } catch (error: any) {
      return res.json({
        message: error?.message || 'Unknown error occurred',
      });
    }
  }
}
