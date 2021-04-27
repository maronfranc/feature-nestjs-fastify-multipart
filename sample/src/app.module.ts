import { Module } from '@nestjs/common';
import { LocalUploadModule } from './local-upload/local-upload.module';

@Module({
  imports: [LocalUploadModule],
})
export class AppModule { }