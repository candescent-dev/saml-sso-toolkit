import { Module } from '@nestjs/common';
import { AppService } from './app.service';
import { AppController } from './app.controller';
import { AuthValidatorModule } from './authValidator/authValidator.module';

@Module({
  imports: [AuthValidatorModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
