import { NestInterceptor, Type } from '@nestjs/common';
import { MultipartOptions } from '../interfaces/multipart-options.interface';
export declare const AnyFilesInterceptor: (localOptions?: MultipartOptions) => Type<NestInterceptor>;
