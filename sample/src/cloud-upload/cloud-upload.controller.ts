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
import {
  AnyFilesInterceptor,
  FastifyMultipartFile,
  FileFieldsInterceptor,
  FileInterceptor,
  FilesInterceptor,
  MultipartFile,
} from '@nestjs/platform-fastify/multipart';
import { FastifyRequest } from 'fastify';
import { FakeCloudService } from '../fake/fake-cloud.service';
import {
  MIMETYPES_APPLICATION,
  MIMETYPES_IMAGE,
} from '../utils/mimetypes.constant';

type Callback = (error: Error | null, acceptFile?: boolean) => void;

@Controller('cloud-upload')
/** sample for interceptor with undefined dest */
export class CloudUploadController {
  constructor(private readonly cloudService: FakeCloudService) { }

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
          const typesList = applicationMimeTypes.join(',');
          return cb(new BadRequestException(`file extension not listed in (${typesList})`));
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
          const typesList = applicationMimeTypes.join(',');
          return cb(new BadRequestException(`file extension not listed in (${typesList})`));
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
        'upload/cloud/fields',
        fileFields.profile,
      );
    }
    if (fileFields.avatar) {
      await this.cloudService.batchUpload(
        'upload/cloud/fields',
        fileFields.avatar,
      );
    }
    console.log(fileFields);
  }
}
