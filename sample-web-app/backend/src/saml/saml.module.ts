import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { SamlController } from './saml.controller';
import { SamlService } from './saml.service';

@Module({
  imports: [HttpModule],
  controllers: [SamlController],
  providers: [SamlService],
})
export class SamlModule {}
