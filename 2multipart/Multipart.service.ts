import * as path from 'path';
import * as fs from 'fs';
import { MultipartOptions, UploadField } from "./interfaces/multipart-options.interface";
import { multipartExceptions } from "./multipart/multipart.constants";
import { randomStringGenerator } from '@nestjs/common/utils/random-string-generator.util';

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
				fs.mkdir(this.options.dest, { recursive: true }, async (err) => {
					if (err) {
						multipart[fieldName].file.destroy();
						return reject(err);
					}
					try {
						const result = await this.writeFile(multipart[fieldName]);
						return resolve(result);
					} catch (err) {
						return reject(err);
					}
				});
			});
		}
	}

	public files(fieldName: string, maxCount: number) {
		return async (req: any) => {
			return new Promise<any[]>(async (resolve, reject) => {
				let multipartFiles;
				if (req.body) {
					multipartFiles = req.body[fieldName]
				} else {
					const filesAsyncGenerator = await req.files({
						...this.options,
						limits: {
							...this.options?.limits,
							files: maxCount,
						}
					});
					const data = await filesAsyncGenerator.next();
					multipartFiles = data.value?.fields[fieldName];
				}
				if (!multipartFiles) {
					return reject({ message: multipartExceptions.LIMIT_UNEXPECTED_FILE });
				}
				multipartFiles = Array.isArray(multipartFiles) ? multipartFiles : [multipartFiles];
				if (!this.options.dest) {
					return resolve(multipartFiles);
				}
				fs.mkdir(this.options.dest, { recursive: true }, async (err) => {
					if (err) {
						return reject(err);
					}

					try {
						const result = await this.writeFiles(multipartFiles);
						return resolve(result);
					} catch (err) {
						return reject(err);
					}
				});
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
				fs.mkdir(this.options.dest, { recursive: true }, async (err) => {
					const files: any = [];
					const lastIteration = multipartFiles.length - 1;
					for await (const [ii, multipart] of multipartFiles.entries()) {
						if (err) {
							multipart.file.destroy();
							return reject(err);
						}
						try {
							if (Array.isArray(multipart)) {
								const result = await this.writeFiles(multipart);
								files.push(result);
							} else {
								const result = await this.writeFile(multipart);
								files.push(result);
							}
							if (ii === lastIteration) return resolve(files);
						} catch (err) {
							return reject(err);
						}
					}
				});
			});
		}
	}

	public fileFields(uploadFields: UploadField[]) {
		return async (req: any) => {
			return new Promise(async (resolve, reject) => {
				const filesAsyncGenerator = await req.files(this.options);
				const data = await filesAsyncGenerator.next();
				const multipartFields = data?.value?.fields;
				const files: any[] = [];
				const lastIteration = uploadFields.length - 1;
				try {
					await new Promise<void>((resolve, reject) => {
						for (const [ii, field] of uploadFields.entries()) {
							const multipart = multipartFields[field.name];
							if (!multipart || multipart.length === 0 || field.maxCount === 0) continue;
							if (Array.isArray(multipart)) {
								if (multipart.length === 1 || field.maxCount === 1) {
									multipartFields[field.name] = multipart[0];
								} else if (multipart.length > field.maxCount) {
									multipartFields[field.name] = multipart.slice(0, field.maxCount);
								}
							}
							if (!this.options.dest) {
								files.push(multipart);
								if (ii === lastIteration) return resolve();
								continue;
							}
							fs.mkdir(this.options.dest, { recursive: true }, async (err) => {
								if (err) return reject(err);
								try {
									if (Array.isArray(multipart)) {
										const result = await this.writeFiles(multipart);
										files.push(result);
									} else {
										const result = await this.writeFile(multipart);
										files.push(result);
									}
									if (ii === lastIteration) return resolve();
								} catch (err) {
									return reject(err);
								}
							});
						}
					});
				} catch (err) {
					return reject(err);
				}
				return resolve(files);
			});
		}
	}

	private async writeFile(multipart: any): Promise<any> {
		return new Promise((resolve, reject) => {
			const file = { ...multipart };
			const filename = multipart.filename
			file.originalname = filename;
			file.filename = randomStringGenerator();
			const filePath = path.join(this.options.dest, file.filename);
			const outStream = fs.createWriteStream(filePath);
			file.file.pipe(outStream);
			outStream.on('error', (err) => {
				file.file.destroy();
				return reject(err);
			});
			outStream.on('finish', () => {
				file.size = outStream.bytesWritten;
				return resolve(file);
			});
		});
	}

	private async writeFiles(multipartFiles: any[]): Promise<any> {
		return new Promise(async (resolve, reject) => {
			const files: any = [];
			const lastIteration = multipartFiles.length - 1;
			for await (const [i, multipart] of multipartFiles.entries()) {
				try {
					const result = await this.writeFile(multipart);
					files.push(result);
				} catch (err) {
					return reject(err);
				}
				if (i === lastIteration) return resolve(files);
			}
		});
	}
}
