import { Module } from '@nestjs/common';
import { AppService } from './app.service';
import { SamlModule } from './saml/saml.module';
import { AppController } from './app.controller';
import { CacheModule } from '@nestjs/cache-manager';
import { E2ETestModule } from './e2eTest/e2eTest.module';
import { AppConfigModule } from './appConfig/appConfig.module';
import { PublicKeyModule } from './publicKey/publicKey.module';
import { PublishConfigModule } from './publishConfig/publishConfig.module';
@Module({
  imports: [
    AppConfigModule,
    SamlModule,
    PublicKeyModule,
    E2ETestModule,
    PublishConfigModule,
    CacheModule.register({
      // default TTL ignored; per-item TTL used instead
      ttl: 0,
      // Make cache available globally across all modules
      isGlobal: true,
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
