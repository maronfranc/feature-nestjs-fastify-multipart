import * as path from 'path';
import * as fs from 'fs';
import { MultipartOptions } from "./interfaces/multipart-options.interface";
import { multipartExceptions } from "./multipart/multipart.constants";

export class MultipartService {
	public constructor(private options: MultipartOptions) { }

	public file(fieldName: string) {
		return async (req: any) => {
			await new Promise<void>(async (resolve, reject) => {
				const multipart = await req.file(this.options);
				if (!multipart.fields[fieldName]) {
					return reject({ message: multipartExceptions.LIMIT_UNEXPECTED_FILE });
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
							return reject({ message: multipartExceptions.NODE_WRITE_FILE });
						});
						outStream.on('finish', () => {
							multipart.fields[fieldName].size = outStream.bytesWritten;
							req[fieldName] = multipart.fields[fieldName];
							return resolve();
						});
					});
				}
			});
		}
	}

	public files(fieldName: string) {
		return async (req: any) => {
			await new Promise<void>(async (resolve, reject) => {
				const filesAsyncGenerator = await req.files(this.options);
				const data = await filesAsyncGenerator.next();
				const files = data?.value?.fields[fieldName];
				if (!files) {
					return reject({ message: multipartExceptions.LIMIT_UNEXPECTED_FILE });
				}
				if (!this.options.dest) {
					req[fieldName] = Array.isArray(files) ? files : [files];
					return resolve();
				}
				req[fieldName] = [];
				for await (const [i, multipart] of files.entries()) {
					fs.mkdir(this.options.dest, { recursive: true },
						(err) => {
							if (err) {
								multipart.file.destroy();
								return reject({
									message: multipartExceptions.NODE_MKDIR
								});
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
								multipart.size = outStream.bytesWritten;
								req[fieldName].push(multipart);
								if (i === files.length - 1) return resolve();
							});
						}
					);
				}
			});
		}
	}
}