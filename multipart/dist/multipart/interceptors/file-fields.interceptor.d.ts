import { NestInterceptor, Type } from '@nestjs/common';
import { MultipartOptions, UploadField } from '../interfaces/multipart-options.interface';
export declare const FileFieldsInterceptor: (uploadFields: UploadField[], localOptions?: MultipartOptions) => Type<NestInterceptor>;
