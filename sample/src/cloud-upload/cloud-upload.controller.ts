import {
  BadRequestException,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
// feature folder interfaces. Run 'install-file-interceptor' script
import {
  AnyFilesInterceptor,
  FileFieldsInterceptor,
  FileInterceptor,
  FilesInterceptor,
  FastifyMultipartFile,
  MultipartFile,
} from '@nestjs/platform-fastify/multipart';

import {
  MIMETYPES_APPLICATION,
  MIMETYPES_IMAGE,
} from '../utils/mimetypes.constant';
import { FakeCloudService } from '../fake/fake-cloud.service';

type Callback = (error: Error | null, acceptFile?: boolean) => void;

@Controller('cloud-upload')
/** sample for interceptor with undefined dest */
export class CloudUploadController {
  constructor(private readonly cloudService: FakeCloudService) {}

  @Post('file')
  @UseInterceptors(
    FileInterceptor('file', {
      fileFilter: (
        req: FastifyRequest,
        file: FastifyMultipartFile,
        cb: Callback,
      ) => {
        const applicationMimeTypes: string[] = [...MIMETYPES_APPLICATION];
        if (applicationMimeTypes.includes(file.mimetype)) {
          return cb(new BadRequestException('exception sample'));
        }
        cb(null, true);
      },
    }),
  )
  @HttpCode(HttpStatus.NO_CONTENT)
  public async file(@UploadedFile() multipartFile: MultipartFile | undefined) {
    if (multipartFile) {
      await this.cloudService.upload(
        'upload/cloud/file',
        multipartFile.filename,
        multipartFile.file,
      );
    }
    console.log(multipartFile);
  }

  @Post('files')
  @UseInterceptors(
    FilesInterceptor('files', 5, {
      fileFilter: (
        req: FastifyRequest,
        file: FastifyMultipartFile,
        cb: Callback,
      ) => {
        const applicationMimeTypes: string[] = [...MIMETYPES_APPLICATION];
        if (applicationMimeTypes.includes(file.mimetype)) {
          return cb(new BadRequestException('exception sample'));
        }
        cb(null, true);
      },
    }),
  )
  @HttpCode(HttpStatus.NO_CONTENT)
  async files(@UploadedFiles() multipartFiles: MultipartFile[] | undefined) {
    if (multipartFiles.length) {
      await this.cloudService.batchUpload('upload/cloud/files', multipartFiles);
    }
    console.log(multipartFiles);
  }

  @Post('any')
  @UseInterceptors(AnyFilesInterceptor())
  @HttpCode(HttpStatus.NO_CONTENT)
  async any(@UploadedFiles() multipartFiles: MultipartFile[] | undefined) {
    if (multipartFiles) {
      await this.cloudService.batchUpload('upload/cloud/any', multipartFiles);
    }
    console.log(multipartFiles);
  }

  @Post('fields')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'profile', maxCount: 1 },
        { name: 'avatar', maxCount: 1 },
      ],
      {
        fileFilter: (
          req: FastifyRequest,
          file: FastifyMultipartFile,
          cb: Callback,
        ) => {
          const imagesMimeTypes: string[] = [...MIMETYPES_IMAGE];
          if (!imagesMimeTypes.includes(file.mimetype)) {
            return cb(new BadRequestException('please upload an image'));
          }
          cb(null, true);
        },
      },
    ),
  )
  @HttpCode(HttpStatus.NO_CONTENT)
  async fields(
    @UploadedFiles() fileFields: Record<string, MultipartFile[]> | undefined,
  ) {
    if (fileFields.profile) {
      await this.cloudService.batchUpload(
        'upload/cloud/fields/profile',
        fileFields.profile,
      );
    }
    if (fileFields.avatar) {
      await this.cloudService.batchUpload(
        'upload/cloud/fields/avatar',
        fileFields.avatar,
      );
    }
    console.log(fileFields);
  }
}
