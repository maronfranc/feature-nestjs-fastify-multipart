import * as fs from 'fs';
import * as path from 'path';
import { Injectable } from '@nestjs/common';
// feature folder interfaces. Run 'install-file-interceptor' script
import { MultipartFile } from '@nestjs/platform-fastify/multipart/interfaces';

const randomStringGenerator = () => Math.random().toString(36).substr(2);

@Injectable()
export class FakeCloudService {
  async upload(
    dest: string,
    filename: string,
    file: MultipartFile['file'],
  ): Promise<void> {
    return new Promise(async (resolve, reject) => {
      if (!fs.existsSync(dest)) {
        await fs.promises.mkdir(dest, { recursive: true });
      }
      const extension = path.extname(filename);
      const randomFileName = randomStringGenerator() + extension;
      const filePath = path.join(dest, randomFileName);
      const outStream = fs.createWriteStream(filePath);
      file.pipe(outStream);
      outStream.on('error', (err) => {
        file.destroy();
        return reject(err);
      });
      outStream.on('finish', () => {
        return resolve();
      });
    });
  }

  async batchUpload(
    dest: string,
    multipartFiles: MultipartFile[],
  ): Promise<void> {
    for await (const multipartFile of multipartFiles) {
      await this.upload(dest, multipartFile.filename, multipartFile.file);
    }
  }
}
