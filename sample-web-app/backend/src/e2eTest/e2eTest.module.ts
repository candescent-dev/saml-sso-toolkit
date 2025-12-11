import { Module } from '@nestjs/common';
import { E2ETestController } from './e2eTest.controller';
import { E2ETestService } from './e2eTest.service';

@Module({
  controllers: [E2ETestController],
  providers: [E2ETestService],
})
export class E2ETestModule {}
