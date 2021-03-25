import * as path from 'path';
import * as fs from 'fs';
import { MultipartOptions } from "./interfaces/multipart-options.interface";
import { multipartExceptions } from "./multipart/multipart.constants";

export class MultipartService {
	public constructor(private options: MultipartOptions) { }

	public file(fieldName: string) {
		return async (req: any) => {
			return new Promise<any[]>(async (resolve, reject) => {
				const multipart = req.body ?? (await req.file(this.options)).fields;
				if (!multipart[fieldName]) {
					return reject({ message: multipartExceptions.LIMIT_UNEXPECTED_FILE });
				}
				if (!this.options.dest) {
					return resolve(multipart[fieldName]);
				}
				fs.mkdir(this.options.dest, { recursive: true }, (err) => {
					if (err) {
						multipart[fieldName].file.destroy();
						return reject(err);
					}
					const filePath = path.join(this.options.dest, multipart[fieldName].filename);
					const outStream = fs.createWriteStream(filePath);
					multipart[fieldName].file.pipe(outStream);
					outStream.on('error', (err) => {
						multipart[fieldName].file.destroy();
						return reject(err);
					});
					outStream.on('finish', () => {
						multipart[fieldName].size = outStream.bytesWritten;
						return resolve(multipart[fieldName]);
					});
				});
			});
		}
	}

	public files(fieldName: string, maxCount: number) {
		return async (req: any) => {
			return new Promise<any[]>(async (resolve, reject) => {
				const filesPromise = (await req.files({
					...this.options,
					limits: {
						...this.options?.limits,
						files: maxCount,
					}
				})).next();
				let multipartFiles = req.body ? req.body[fieldName] : (await filesPromise).value?.fields[fieldName];
				if (!multipartFiles) {
					return reject({ message: multipartExceptions.LIMIT_UNEXPECTED_FILE });
				}
				multipartFiles = Array.isArray(multipartFiles) ? multipartFiles : [multipartFiles];
				if (!this.options.dest) {
					return resolve(multipartFiles);
				}
				fs.mkdir(this.options.dest, { recursive: true },
					async (err) => {
						const files: any = [];
						for await (const [i, multipart] of multipartFiles.entries()) {
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
								files.push(multipart);
								if (i === multipartFiles.length - 1) return resolve(files);
							});
						}
					}
				);
			});
		}
	}

	public any() {
		return async (req: any) => {
			return new Promise<any[]>(async (resolve, reject) => {
				const filesAsyncGenerator = await req.files(this.options);
				const data = await filesAsyncGenerator.next();
				const fields = data?.value?.fields;
				let multipartFiles: any = Object.values(fields);
				multipartFiles = Array.isArray(multipartFiles) ? multipartFiles : [multipartFiles];
				if (!this.options.dest) {
					return resolve(multipartFiles);
				}
				fs.mkdir(this.options.dest, { recursive: true },
					async (err) => {
						const files: any = [];
						for await (const [i, multipart] of multipartFiles.entries()) {
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
								files.push(multipart);
								if (i === multipartFiles.length - 1) return resolve(files);
							});
						}
					}
				);
			});
		}
	}
	// chama com writeFile((err) => reject(err), (data) => resolve(data));
	// private writeFile(onErr, onSuccess) { }
}
