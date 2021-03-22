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
				let multipartFiles = data?.value?.fields[fieldName];
				if (!multipartFiles) {
					return reject({ message: multipartExceptions.LIMIT_UNEXPECTED_FILE });
				}
				multipartFiles = Array.isArray(multipartFiles) ? multipartFiles : [multipartFiles];
				if (!this.options.dest) {
					req[fieldName] = multipartFiles;
					return resolve();
				}
				req[fieldName] = [];
				for await (const [i, multipart] of multipartFiles.entries()) {
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
								req[fieldName].push(multipart);
								if (i === multipartFiles.length - 1) return resolve();
							});
						}
					);
				}
			});
		}
	}

	public any() {
		return async (req: any) => {
			await new Promise<void>(async (resolve, reject) => {
				const filesAsyncGenerator = await req.files(this.options);
				const data = await filesAsyncGenerator.next();
				const fields = data?.value?.fields;
				let multipartFiles: any[] = Object.values(fields);
				multipartFiles = Array.isArray(multipartFiles) ? multipartFiles : [multipartFiles];
				if (!this.options.dest) {
					req.files = multipartFiles;
					return resolve();
				}
				const fieldName = 'files';
				req[fieldName] = [];
				for await (const [i, multipart] of multipartFiles.entries()) {
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
								req[fieldName].push(multipart);
								if (i === multipartFiles.length - 1) return resolve();
							});
						}
					);
				}
			});
		}
	}
}