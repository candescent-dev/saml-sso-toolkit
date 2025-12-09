import { Module } from '@nestjs/common';
import { PublishConfigController } from './publishConfig.controller';
import { PublishConfigService } from './publishConfig.service';

@Module({
  controllers: [PublishConfigController],
  providers: [PublishConfigService],
})
export class PublishConfigModule {}
