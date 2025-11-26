import { Module } from '@nestjs/common';
import { AppService } from './app.service';
import { SamlModule } from './saml/saml.module';
import { AppController } from './app.controller';
import { AppConfigModule } from './appConfig/appConfig.module';
import { PublicKeyModule } from './publicKey/publicKey.module';
@Module({
  imports: [AppConfigModule, SamlModule, PublicKeyModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
