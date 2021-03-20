import * as path from 'path';
import * as fs from 'fs';
import { CallHandler, ExecutionContext, Inject, mixin, NestInterceptor, Optional, Type } from '@nestjs/common';
import { Observable } from 'rxjs';
import { MULTIPART_MODULE_OPTIONS } from '../files.constants';
import { transformException } from '../multipart/multipart.utils';
import { MultipartOptions, UploadField } from '../interfaces/multipart-options.interface';
import { multipartExceptions } from '../multipart/multipart.constants';

export const FileFieldsInterceptor = (
	uploadFields: UploadField[],
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
					const fieldName = 'files';
					req[fieldName] = [];
					if (!this.options.dest) {
						for (const field of uploadFields) {
							if (field.maxCount === 0) {
								continue
							};
							const value = fields[field.name];
							if (Array.isArray(value)) {
								if (value.length === 1 || field.maxCount === 1) {
									req[fieldName][field.name] = value[0];
									continue;
								}
								if (value.length > field.maxCount) {
									req[fieldName][field.name] = value.slice(0, field.maxCount);
									continue;
								}
							}
							req[fieldName][field.name] = value;
						}
						return resolve();
					}
					for await (const [i, multipart] of req[fieldName].entries()) {
						// TODO: check if multipart isArray and loop writing strean
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
									if (i === req[fieldName].length - 1) return resolve();
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

		// private async diskStorage(multipart): Promise<any> {
		// 	return new Promise((resolve, reject) => {
		// 		fs.mkdir(this.options.dest, { recursive: true },
		// 			(err) => {}
		// 		);
		// 	});
		// }
	}

	const Interceptor = mixin(MixinInterceptor);
	return Interceptor as Type<NestInterceptor>;
};
