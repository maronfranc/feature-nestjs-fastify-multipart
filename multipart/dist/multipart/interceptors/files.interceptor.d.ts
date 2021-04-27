import { NestInterceptor, Type } from '@nestjs/common';
import { MultipartOptions } from '../interfaces/multipart-options.interface';
export declare const FilesInterceptor: (fieldname: string, maxCount?: number, localOptions?: MultipartOptions) => Type<NestInterceptor>;
