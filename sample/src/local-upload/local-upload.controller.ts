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
  MultipartDiskFile,
} from '@nestjs/platform-fastify/multipart';

import {
  MIMETYPES_APPLICATION,
  MIMETYPES_IMAGE,
} from '../utils/mimetypes.constant';

type Callback = (error: Error | null, acceptFile?: boolean) => void;

@Controller('local-upload')
/** sample for interceptor with typeof dest === 'string' */
export class LocalUploadController {
  @Post('file')
  @UseInterceptors(
    FileInterceptor('file', {
      dest: 'upload/local/file',
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
  public async file(
    @UploadedFile() multipartDiskFile: MultipartDiskFile | undefined,
  ) {
    console.log(multipartDiskFile);
  }

  @Post('files')
  @UseInterceptors(
    FilesInterceptor('files', 5, {
      dest: 'upload/local/files',
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
  async files(
    @UploadedFiles() multipartDiskFiles: MultipartDiskFile[] | undefined,
  ) {
    console.log(multipartDiskFiles);
  }

  @Post('any')
  @UseInterceptors(
    AnyFilesInterceptor({
      dest: 'upload/local/any',
    }),
  )
  @HttpCode(HttpStatus.NO_CONTENT)
  async any(
    @UploadedFiles() multipartDiskFiles: MultipartDiskFile[] | undefined,
  ) {
    console.log(multipartDiskFiles);
  }

  @Post('fields')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'profile', maxCount: 1 },
        { name: 'avatar', maxCount: 1 },
      ],
      {
        dest: 'upload/local/fields',
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
  async fileFields(
    @UploadedFiles()
    fileFields: Record<string, MultipartDiskFile[]> | undefined,
  ) {
    console.log(fileFields);
  }
}
