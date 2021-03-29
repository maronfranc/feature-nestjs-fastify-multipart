import * as path from 'path';
import * as fs from 'fs';
import { MultipartOptions, UploadField } from "./interfaces/multipart-options.interface";
import { multipartExceptions } from "./multipart/multipart.constants";
import { randomStringGenerator } from '@nestjs/common/utils/random-string-generator.util';

interface MultipartFields {
	[x: string]: MultipartFile;
}

interface MultipartFile {
	toBuffer: () => Promise<Buffer>,
	file: NodeJS.ReadStream,
	filepath: string,
	fieldname: string,
	filename: string,
	encoding: string,
	mimetype: string,
	fields: MultipartFields
}

interface InterceptorFile extends MultipartFile {
	originalname: string;
	size: number;
}

export class MultipartService {
	public constructor(private options: MultipartOptions) { }

	public file(fieldName: string) {
		return async (req: any): Promise<InterceptorFile> => {
			return new Promise<InterceptorFile>(async (resolve, reject) => {
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
		return async (req: any): Promise<InterceptorFile[]> => {
			return new Promise<InterceptorFile[]>(async (resolve, reject) => {
				let multipartFiles: InterceptorFile[];
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
				if (!this.options.dest) return resolve(multipartFiles);
				fs.mkdir(this.options.dest, { recursive: true }, async (err) => {
					if (err) return reject(err);
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
		return async (req: any): Promise<InterceptorFile[]> => {
			const filesAsyncGenerator = await req.files(this.options);
			const data = await filesAsyncGenerator.next();
			const fields = data?.value?.fields;
			const values = Object.values(fields);
			const multipartFiles: InterceptorFile[] = Array.isArray(values) ? values : [values];
			return new Promise<InterceptorFile[]>(async (resolve, reject) => {
				if (!this.options.dest) {
					return resolve(multipartFiles);
				}
				fs.mkdir(this.options.dest, { recursive: true }, async (err) => {
					const files: InterceptorFile[] = [];
					const lastIteration = multipartFiles.length - 1;
					for await (const [ii, multipart] of multipartFiles.entries()) {
						if (err) {
							multipart.file.destroy();
							return reject(err);
						}
						try {
							if (Array.isArray(multipart)) {
								const filesWritten = await this.writeFiles(multipart);
								files.push(...filesWritten);
								if (ii === lastIteration) return resolve(files);
							} else {
								const fileWritten = await this.writeFile(multipart);
								files.push(fileWritten);
								if (ii === lastIteration) return resolve(files);
							}
						} catch (err) {
							return reject(err);
						}
					}
				});
			});
		}
	}

	public fileFields(uploadFields: UploadField[]) {
		return async (req: any): Promise<any> => {
			return new Promise(async (resolve, reject) => {
				const filesAsyncGenerator = await req.files(this.options);
				const data = await filesAsyncGenerator.next();
				const multipartFields = data?.value?.fields;
				const fieldsObject: Record<string, any[]> = Object.create(null);
				const lastIteration = uploadFields.length - 1;
				try {
					await new Promise<void>(async (resolve, reject) => {
						for (const [ii, field] of uploadFields.entries()) {
							const fieldFile: InterceptorFile | InterceptorFile[] = multipartFields[field.name];
							const multipartFiles: InterceptorFile[] = Array.isArray(fieldFile) ? fieldFile : [fieldFile];
							if (!multipartFiles || field.maxCount === 0) continue;
							if (multipartFiles.length === 0) continue;
							if (!this.options.dest) {
								fieldsObject[field.name] = multipartFiles;
								if (ii === lastIteration) return resolve();
								continue;
							}
							fs.mkdir(this.options.dest, { recursive: true }, async (err) => {
								if (err) return reject(err);
								try {
									const files = await this.writeFiles(multipartFiles);
									fieldsObject[field.name] = files;
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
				return resolve(fieldsObject);
			});
		}
	}

	private async writeFile(multipart: InterceptorFile): Promise<InterceptorFile> {
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

	private async writeFiles(multipartFiles: InterceptorFile[]): Promise<InterceptorFile[]> {
		return new Promise(async (resolve, reject) => {
			const files: InterceptorFile[] = [];
			const lastIteration = multipartFiles.length - 1;
			for await (const [ii, multipart] of multipartFiles.entries()) {
				try {
					const result = await this.writeFile(multipart);
					files.push(result);
				} catch (err) {
					return reject(err);
				}
				if (ii === lastIteration) return resolve(files);
			}
		});
	}
}
