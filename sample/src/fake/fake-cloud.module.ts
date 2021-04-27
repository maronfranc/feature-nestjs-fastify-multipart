import { Module } from '@nestjs/common';
import { FakeCloudService } from './fake-cloud.service';

@Module({
  providers: [FakeCloudService],
  exports: [FakeCloudService],
})
export class FakeCloudModule {}
