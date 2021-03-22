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
			const req = context.switchToHttp().getRequest();
			try {
				await new Promise<void>(async (resolve, reject) => {
					const filesAsyncGenerator = await req.files(this.options);
					const data = await filesAsyncGenerator.next();
					const fields = data?.value?.fields;
					console.log(" ----- ----- | fields | ----- ----- ", typeof fields);
					console.log(fields);
					console.log(" _____ _____ | fields | _____ _____ ", typeof fields);
					const fieldName = 'files';
					req[fieldName] = [];
					for (const field of uploadFields) {
						if (field.maxCount === 0) continue;
						const value = fields[field.name];
						if (Array.isArray(value)) {
							if (value.length === 1 || field.maxCount === 1) {
								req[fieldName][field.name] = value[0];
							} else if (value.length > field.maxCount) {
								req[fieldName][field.name] = value.slice(0, field.maxCount);
							}
							console.log(" ----- ----- | value | ----- ----- ", typeof value);
							console.log(value);
							console.log(" _____ _____ | value | _____ _____ ", typeof value);
							console.log(" ----- ----- | value.entries() | ----- ----- ", typeof value.entries());
							console.log(value.entries());
							console.log(" _____ _____ | value.entries() | _____ _____ ", typeof value.entries());
							for await (const [i, multipart] of value.entries()) {
								console.log(" ----- ----- | multipart | ----- ----- ", typeof multipart);
								console.log(multipart);
								console.log(" _____ _____ | multipart | _____ _____ ", typeof multipart);
								fs.mkdir(this.options.dest, { recursive: true },
									(err) => {
										if (err) {
											multipart.file.destroy();
											return reject(err);
										}
										const filePath = path.join(this.options.dest, multipart.filename);
										const outStream = fs.createWriteStream(filePath);
										multipart.file.pipe(outStream);
										outStream.on('error', (err) => {
											multipart.file.destroy();
											return reject(err);
										});
										outStream.on('finish', () => {
											multipart.size = outStream.bytesWritten;
											console.log(" ----- ----- | multipart | ----- ----- ", typeof multipart);
											console.log(multipart);
											console.log(" _____ _____ | multipart | _____ _____ ", typeof multipart);
											req[fieldName].push(multipart);
											if (i === req[fieldName].length - 1) return resolve();
										});
									}
								);
							}
						} else {
							fs.mkdir(this.options.dest, { recursive: true },
								(err) => {
									if (err) {
										value.file.destroy();
										return reject(err);
									}
									const filePath = path.join(this.options.dest, value.filename);
									const outStream = fs.createWriteStream(filePath);
									value.file.pipe(outStream);
									outStream.on('error', (err) => {
										value.file.destroy();
										return reject(err);
									});
									outStream.on('finish', () => {
										value.size = outStream.bytesWritten;
										req[fieldName].push(value);
										return resolve();
									});
								}
							);
							req[fieldName][field.name] = value;
						}
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
