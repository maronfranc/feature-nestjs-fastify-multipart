import * as path from 'path';
import * as fs from 'fs';
import { MultipartOptions, UploadField } from "./interfaces/multipart-options.interface";
import { randomStringGenerator } from '@nestjs/common/utils/random-string-generator.util';
import { InterceptorFile } from './interfaces/multipart-file.interface';
import { multipartExceptions } from './multipart/multipart.constants';

export class MultipartWrapper {
	public constructor(private options: MultipartOptions) { }

	public file(fieldname: string) {
		return async (req: any): Promise<InterceptorFile> => {
			return new Promise<InterceptorFile>(async (resolve, reject) => {
				try {
					const multipart = await this.getFileFields(req, this.options);
					if (this.options.fileFilter) {
						this.options.fileFilter(req, multipart[fieldname], (error, acceptFile) => {
							if (error) throw error;
							if (!acceptFile) return resolve(undefined);
						});
					}
					const fieldFile = multipart[fieldname];
					if (!this.options.dest) return resolve(fieldFile);
					fs.mkdir(this.options.dest, { recursive: true }, async (err) => {
						if (err) {
							fieldFile.file.destroy();
							return reject(err);
						}
						const result = await this.writeFile(fieldFile);
						return resolve(result);
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
					let multipartFiles: InterceptorFile[] = Array.isArray(fieldFiles) ? fieldFiles : [fieldFiles];
					if (this.options.fileFilter) {
						multipartFiles = this.filterFiles(req, multipartFiles);
					}
					if (multipartFiles.length === 0) return resolve(undefined);
					if (!this.options.dest) return resolve(multipartFiles);
					fs.mkdir(this.options.dest, { recursive: true }, async (err) => {
						if (err) return reject(err);
						const result = await this.writeFiles(multipartFiles);
						return resolve(result);
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
					let multipartFiles: InterceptorFile[] = ([] as InterceptorFile[]).concat(...multipartFilesValues);
					if (this.options.fileFilter) {
						multipartFiles = this.filterFiles(req, multipartFiles);
					}
					if (multipartFiles.length === 0) return resolve(undefined);
					if (!this.options.dest) return resolve(multipartFiles);
					fs.mkdir(this.options.dest, { recursive: true }, async (err) => {
						if (err) return reject(err);
						const result = await this.writeFiles(multipartFiles);
						return resolve(result);
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
					const multipartFieldKeys = Object.keys(multipartFields);
					const uploadFieldKeys = uploadFields.map((uploadField) => uploadField.name);
					for (const multipartFieldKey of multipartFieldKeys) {
						if (!uploadFieldKeys.includes(multipartFieldKey)) return reject({
							message: multipartExceptions.LIMIT_UNEXPECTED_FILE
						});
					}
					const lastIteration = uploadFields.length - 1;
					let fieldsObject: Record<string, InterceptorFile[]> | undefined = undefined;
					for (const [ii, field] of uploadFields.entries()) {
						const fieldFile: InterceptorFile | InterceptorFile[] = multipartFields[field.name];
						if (!fieldFile || field.maxCount === 0) continue;
						let multipartFiles: InterceptorFile[] = Array.isArray(fieldFile) ? fieldFile : [fieldFile];
						if (this.options.fileFilter) {
							multipartFiles = this.filterFiles(req, multipartFiles);
						}
						if (multipartFiles.length > field.maxCount) {
							return reject({
								message: multipartExceptions.FST_FILES_LIMIT
							});
						}
						if (multipartFiles.length === 0) {
							if (ii === lastIteration) return resolve(fieldsObject);
							continue;
						};
						if (!this.options.dest) {
							if (!fieldsObject) {
								fieldsObject = Object.create(null);
							}
							fieldsObject[field.name] = multipartFiles;
							if (ii === lastIteration) return resolve(fieldsObject);
							continue;
						}
						fs.mkdir(this.options.dest, { recursive: true }, async (err) => {
							if (err) return reject(err);
							try {
								const files = await this.writeFiles(multipartFiles);
								if (!fieldsObject) {
									fieldsObject = Object.create(null);
								}
								fieldsObject[field.name] = files;
								if (ii === lastIteration) return resolve(fieldsObject);
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
			const filename = multipartFile.filename;
			const extension = path.extname(multipartFile.filename);
			multipartFile.originalname = filename;
			multipartFile.filename = randomStringGenerator() + extension;
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

	private async getFileFields(req: any, options: MultipartOptions): Promise<Record<string, InterceptorFile> | undefined> {
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

	private filterFiles(req: any, multipartFiles: InterceptorFile[]): InterceptorFile[] {
		const files: InterceptorFile[] = [];
		for (const multipart of multipartFiles) {
			this.options.fileFilter(req, multipart, (err, acceptFile) => {
				if (err) throw err;
				if (acceptFile) {
					files.push(multipart)
				};
			});
		}
		return files;
	}
}
