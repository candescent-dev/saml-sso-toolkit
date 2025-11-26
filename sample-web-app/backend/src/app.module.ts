import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppConfigModule } from './appConfig/appConfig.module';
import { SamlModule } from './saml/saml.module';
@Module({
  imports: [AppConfigModule, SamlModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
