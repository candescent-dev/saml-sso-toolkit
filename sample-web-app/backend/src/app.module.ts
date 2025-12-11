import { Module } from '@nestjs/common';
import { AppService } from './app.service';
import { SamlModule } from './saml/saml.module';
import { AppController } from './app.controller';
import { AppConfigModule } from './appConfig/appConfig.module';
import { PublicKeyModule } from './publicKey/publicKey.module';
import { E2ETestModule } from './e2eTest/e2eTest.module';
import { PublishConfigModule } from './publishConfig/publishConfig.module';
@Module({
  imports: [AppConfigModule, SamlModule, PublicKeyModule, E2ETestModule, PublishConfigModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
