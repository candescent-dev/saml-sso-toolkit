import { Module } from '@nestjs/common';
import { AppConfigProvider } from './appConfig.provider';

@Module({
  providers: [AppConfigProvider],
  exports: [AppConfigProvider],
})
export class AppConfigModule {}
