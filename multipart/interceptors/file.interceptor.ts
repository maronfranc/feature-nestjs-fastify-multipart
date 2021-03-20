import { CallHandler, ExecutionContext, Inject, mixin, NestInterceptor, Optional, Type } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { Observable } from 'rxjs';
import { MULTIPART_MODULE_OPTIONS } from '../files.constants';
import { transformException } from '../multipart/multipart.utils';
import { multipartExceptions } from '../multipart/multipart.constants';
import { MultipartOptions } from '../interfaces/multipart-options.interface';

export const FileInterceptor = (fieldName: string, localOptions?: MultipartOptions): Type<NestInterceptor> => {
	class MixinInterceptor implements NestInterceptor {
		protected options: MultipartOptions;

		public constructor(
			@Optional()
			@Inject(MULTIPART_MODULE_OPTIONS)
			options: MultipartOptions = {}
		) {
			this.options = {
				...options,
				...localOptions
			};
		}

		public async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
			const ctx = context.switchToHttp();
			const req = ctx.getRequest();

			try {
				await new Promise<void>(async (resolve, reject) => {
					const multipart = await req.file(this.options);
					if (!multipart.fields[fieldName]) {
						return reject({
							message: multipartExceptions.LIMIT_UNEXPECTED_FILE
						});
					}
					if (this.options.dest) {
						fs.mkdir(this.options.dest, { recursive: true }, (err) => {
							if (err) {
								multipart.fields[fieldName].file.destroy();
								return reject({ message: multipartExceptions.NODE_MKDIR });
							}
							const filePath = path.join(this.options.dest, multipart.filename);
							const outStream = fs.createWriteStream(filePath);
							multipart.file.pipe(outStream);
							outStream.on('error', (err) => {
								multipart.file.destroy();
								return reject({
									message: multipartExceptions.NODE_WRITE_FILE
								});
							});
							outStream.on('finish', () => {
								multipart.fields[fieldName].size = outStream.bytesWritten;
							});
						});
					}
					req[fieldName] = multipart.fields[fieldName];
					return resolve();
				});
			} catch (err) {
				throw transformException(err);
			}
			return next.handle();
		}
	}

	const Interceptor = mixin(MixinInterceptor);
	return Interceptor as Type<NestInterceptor>;
};
