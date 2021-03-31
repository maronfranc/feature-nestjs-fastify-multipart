import * as path from 'path';
import * as fs from 'fs';
import { MultipartOptions, UploadField } from "./interfaces/multipart-options.interface";
import { randomStringGenerator } from '@nestjs/common/utils/random-string-generator.util';

interface MultipartFields {
	[x: string]: InterceptorFile | InterceptorFile[];
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

export class MultipartWrapper {
	public constructor(private options: MultipartOptions) { }

	public file(fieldname: string) {
		return async (req: any): Promise<InterceptorFile> => {
			return new Promise<InterceptorFile>(async (resolve, reject) => {
				try {
					const multipart = await this.getFileFields(req, this.options);
					const fieldFile = multipart[fieldname];
					if (!this.options.dest) return resolve(fieldFile);
					fs.mkdir(this.options.dest, { recursive: true }, async (err) => {
						if (err) {
							fieldFile.file.destroy();
							return reject(err);
						}
						try {
							const result = await this.writeFile(fieldFile);
							return resolve(result);
						} catch (err) {
							return reject(err);
						}
					});
				} catch (err) {
					return reject(err);
				}
			});
		}
	}

	public files(fieldname: string, maxCount?: number) {
		return async (req: any): Promise<InterceptorFile[]> => {
			return new Promise<InterceptorFile[]>(async (resolve, reject) => {
				try {
					const options = { ...this.options };
					if (maxCount) {
						options.limits = {
							...options.limits,
							files: maxCount
						};
					}
					const fileFields = await this.getFilesFields(req, options);
					const fieldFiles = fileFields[fieldname];
					const multipartFiles: InterceptorFile[] = Array.isArray(fieldFiles) ? fieldFiles : [fieldFiles];
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
				} catch (err) {
					return reject(err);
				}
			});
		}
	}

	public any() {
		return async (req: any): Promise<InterceptorFile[]> => {
			return new Promise<InterceptorFile[]>(async (resolve, reject) => {
				try {
					const fields = await this.getFilesFields(req, this.options);
					const multipartFilesValues = Object.values<InterceptorFile | InterceptorFile[]>(fields);
					if (!this.options.dest) {
						const flatMultipartFile: InterceptorFile[] = ([] as InterceptorFile[]).concat(...multipartFilesValues);
						return resolve(flatMultipartFile);
					};
					fs.mkdir(this.options.dest, { recursive: true }, async (err) => {
						if (err) return reject(err);
						const files: InterceptorFile[] = [];
						const lastIteration = multipartFilesValues.length - 1;
						for (const [ii, multipart] of multipartFilesValues.entries()) {
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
				} catch (err) {
					return reject(err);
				}
			});
		}
	}

	public fileFields(uploadFields: UploadField[]) {
		return async (req: any): Promise<Record<string, InterceptorFile[]>> => {
			return new Promise(async (resolve, reject) => {
				try {
					const multipartFields = await this.getFilesFields(req, this.options);
					const fieldsObject: Record<string, InterceptorFile[]> = Object.create(null);
					const lastIteration = uploadFields.length - 1;
					let filesTotal = 0;
					let filesWritten = 0;
					for (const field of uploadFields) {
						const fieldFile: InterceptorFile | InterceptorFile[] = multipartFields[field.name];
						if (!fieldFile || field.maxCount === 0) continue;
						const multipartFiles: InterceptorFile[] = Array.isArray(fieldFile) ? fieldFile : [fieldFile];
						if (multipartFiles.length === 0) continue;
						if (!this.options.dest) {
							fieldsObject[field.name] = multipartFiles;
							if (filesWritten === lastIteration) return resolve(fieldsObject);
							continue;
						}
						fs.mkdir(this.options.dest, { recursive: true }, async (err) => {
							if (err) return reject(err);
							try {
								filesTotal += multipartFiles.length;
								const files = await this.writeFiles(multipartFiles);
								filesWritten += files.length;
								fieldsObject[field.name] = files;
								if (filesWritten === filesTotal) return resolve(fieldsObject);
							} catch (err) {
								return reject(err);
							}
						});
					}
				} catch (err) {
					return reject(err);
				}
			});
		}
	}

	private async writeFile(file: InterceptorFile): Promise<InterceptorFile> {
		return new Promise((resolve, reject) => {
			const multipartFile = { ...file };
			const filename = multipartFile.filename
			multipartFile.originalname = filename;
			multipartFile.filename = randomStringGenerator();
			const filePath = path.join(this.options.dest, multipartFile.filename);
			const outStream = fs.createWriteStream(filePath);
			multipartFile.file.pipe(outStream);
			outStream.on('error', (err) => {
				multipartFile.file.destroy();
				return reject(err);
			});
			outStream.on('finish', () => {
				multipartFile.size = outStream.bytesWritten;
				return resolve(multipartFile);
			});
		});
	}

	private async writeFiles(files: InterceptorFile[]): Promise<InterceptorFile[]> {
		return new Promise(async (resolve, reject) => {
			const multipartFiles: InterceptorFile[] = [];
			const lastIteration = files.length - 1;
			for await (const [ii, multipart] of files.entries()) {
				try {
					const result = await this.writeFile(multipart);
					multipartFiles.push(result);
				} catch (err) {
					return reject(err);
				}
				if (ii === lastIteration) return resolve(multipartFiles);
			}
		});
	}

	private async getFileFields(req: any, options: MultipartOptions): Promise<Record<string, InterceptorFile>> {
		if (req.body) return req.body;
		const file = await req.file(options);
		return file.fields;
	}

	private async getFilesFields(req: any, options: MultipartOptions): Promise<Record<string, InterceptorFile[]>> {
		if (req.body) return req.body;
		const filesAsyncGenerator = await req.files(options);
		const data = await filesAsyncGenerator.next();
		return data.value?.fields;
	}
}
