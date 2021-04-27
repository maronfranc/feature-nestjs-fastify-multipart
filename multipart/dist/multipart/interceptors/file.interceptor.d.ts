import { NestInterceptor, Type } from '@nestjs/common';
import { MultipartOptions } from '../interfaces/multipart-options.interface';
export declare const FileInterceptor: (fieldname: string, localOptions?: MultipartOptions) => Type<NestInterceptor>;
