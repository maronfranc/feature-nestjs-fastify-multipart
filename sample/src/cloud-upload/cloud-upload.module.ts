import { Module } from '@nestjs/common';
import { FakeCloudModule } from '../fake/fake-cloud.module';
import { CloudUploadController } from './cloud-upload.controller';

@Module({
  controllers: [CloudUploadController],
  imports: [FakeCloudModule],
})
export class CloudUploadModule {}
