import { Module } from '@nestjs/common';
import { CloudUploadModule } from './cloud-upload/cloud-upload.module';
import { LocalUploadModule } from './local-upload/local-upload.module';

@Module({
  imports: [LocalUploadModule, CloudUploadModule],
})
export class AppModule {}
