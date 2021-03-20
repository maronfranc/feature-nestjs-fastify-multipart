import * as path from 'path';
import * as fs from 'fs';
import { CallHandler, ExecutionContext, Inject, mixin, NestInterceptor, Optional, Type } from '@nestjs/common';
import { Observable } from 'rxjs';
import { MULTIPART_MODULE_OPTIONS } from '../files.constants';
import { transformException } from '../multipart/multipart.utils';
import { MultipartOptions } from '../interfaces/multipart-options.interface';
import { multipartExceptions } from '../multipart/multipart.constants';

export const AnyFilesInterceptor = (
	localOptions?: MultipartOptions,
): Type<NestInterceptor> => {
	class MixinInterceptor implements NestInterceptor {
		protected options: MultipartOptions;

		public constructor(
			@Optional()
			@Inject(MULTIPART_MODULE_OPTIONS)
			options: MultipartOptions = {}
		) {
			this.options = {
				...options,
				...localOptions,
			};
		}

		public async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
			const ctx = context.switchToHttp();
			const req = ctx.getRequest();
			try {
				await new Promise<void>(async (resolve, reject) => {
					const filesAsyncGenerator = await req.files(this.options);
					const data = await filesAsyncGenerator.next();
					const fields = data?.value?.fields;
					const files: any[] = Object.values(fields);
					if (!this.options.dest) {
						req.files = files;
						return resolve();
					}
					const fieldName = 'files';
					req[fieldName] = [];
					for await (const [i, multipart] of files.entries()) {
						console.log(" ----- ----- | multipart | ----- ----- ", typeof multipart);
						console.log(multipart);
						console.log(" _____ _____ | multipart | _____ _____ ", typeof multipart);
						fs.mkdir(this.options.dest, { recursive: true },
							(err) => {
								if (err) {
									multipart.file.destroy();
									return reject({ message: multipartExceptions.NODE_MKDIR });
								}
								const filePath = path.join(this.options.dest, multipart.filename);
								const outStream = fs.createWriteStream(filePath);
								multipart.file.pipe(outStream);
								outStream.on('error', (err) => {
									multipart.file.destroy();
									return reject({ message: multipartExceptions.NODE_WRITE_FILE });
								});
								outStream.on('finish', () => {
									multipart.size = outStream.bytesWritten;
									req[fieldName].push(multipart);
									if (i === files.length - 1) return resolve();
								});
							}
						);
					}
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
