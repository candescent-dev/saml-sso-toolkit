import { Module } from '@nestjs/common';
import { PublicKeyController } from './publicKey.controller';
import { PublicKeyService } from './publicKey.service';

@Module({
  controllers: [PublicKeyController],
  providers: [PublicKeyService],
})
export class PublicKeyModule {}
