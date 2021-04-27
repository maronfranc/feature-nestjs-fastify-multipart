import { Module } from '@nestjs/common';
import { LocalUploadController } from './local-upload.controller';

@Module({
  controllers: [LocalUploadController],
})
export class LocalUploadModule {}
