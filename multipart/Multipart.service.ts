import * as path from 'path';
import * as fs from 'fs';
import { MultipartOptions, UploadField } from "./interfaces/multipart-options.interface";
import { randomStringGenerator } from '@nestjs/common/utils/random-string-generator.util';
import { InterceptorFile } from './interfaces/multipart-file.interface';
import { multipartExceptions } from './multipart/multipart.constants';

export class MultipartWrapper {
	public constructor(private options: MultipartOptions) { }

	public file(fieldname: string) {
		return async (req: any): Promise<InterceptorFile | undefined> => {
			return new Promise<InterceptorFile>(async (resolve, reject) => {
				try {
					const fieldFile = await this.getFileFields(req);
					const multipartFile = fieldFile[fieldname];
					if (!multipartFile) return resolve(undefined);
					if (this.options.fileFilter) {
						this.options.fileFilter(req, multipartFile, (err, acceptFile) => {
							if (err) throw err;
							if (!acceptFile) return resolve(undefined);
						});
					}
					if (!this.options.dest) return resolve(multipartFile);
					fs.mkdir(this.options.dest, { recursive: true }, async (err) => {
						if (err) {
							multipartFile.file.destroy();
							return reject(err);
						}
						const file = await this.writeFile(multipartFile);
						return resolve(file);
					});
				} catch (err) {
					return reject(err);
				}
			});
		}
	}

	public files(fieldname: string, maxCount?: number) {
		return async (req: any): Promise<InterceptorFile[] | undefined> => {
			return new Promise<InterceptorFile[]>(async (resolve, reject) => {
				try {
					const options = { ...this.options };
					if (maxCount) {
						options.limits = {
							...options.limits,
							files: maxCount
						};
					}
					const multipartFileFields = await this.getFilesFields(req, options);
					const fieldFiles = multipartFileFields[fieldname];
					let multipartFiles: InterceptorFile[] = Array.isArray(fieldFiles) ? fieldFiles : [fieldFiles];
					if (this.options.fileFilter) {
						multipartFiles = this.filterFiles(req, multipartFiles);
					}
					if (multipartFiles.length === 0) return resolve(undefined);
					if (!this.options.dest) return resolve(multipartFiles);
					fs.mkdir(this.options.dest, { recursive: true }, async (err) => {
						if (err) return reject(err);
						const files = await this.writeFiles(multipartFiles);
						return resolve(files);
					});
				} catch (err) {
					return reject(err);
				}
			});
		}
	}

	public any() {
		return async (req: any): Promise<InterceptorFile[]> => {
			return new Promise<InterceptorFile[] | undefined>(async (resolve, reject) => {
				try {
					const fields = await this.getFilesFields(req);
					const multipartFilesValues = Object.values<InterceptorFile | InterceptorFile[]>(fields);
					let multipartFiles: InterceptorFile[] = ([] as InterceptorFile[]).concat(...multipartFilesValues);
					if (this.options.fileFilter) {
						multipartFiles = this.filterFiles(req, multipartFiles);
					}
					if (multipartFiles.length === 0) return resolve(undefined);
					if (!this.options.dest) return resolve(multipartFiles);
					fs.mkdir(this.options.dest, { recursive: true }, async (err) => {
						if (err) return reject(err);
						const files = await this.writeFiles(multipartFiles);
						return resolve(files);
					});
				} catch (err) {
					return reject(err);
				}
			});
		}
	}

	public fileFields(uploadFields: UploadField[]) {
		return async (req: any): Promise<Record<string, InterceptorFile[]> | undefined> => {
			return new Promise(async (resolve, reject) => {
				try {
					const multipartFields = await this.getFilesFields(req);
					const multipartFieldKeys = Object.keys(multipartFields);
					const uploadFieldKeys = uploadFields.map((uploadField) => uploadField.name);
					for (const multipartFieldKey of multipartFieldKeys) {
						if (!uploadFieldKeys.includes(multipartFieldKey)) {
							return reject({
								message: multipartExceptions.LIMIT_UNEXPECTED_FILE
							});
						};
					}
					const lastIteration = uploadFields.length - 1;
					let fieldsObject: Record<string, InterceptorFile[]>;
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
							const files = await this.writeFiles(multipartFiles);
							if (!fieldsObject) {
								fieldsObject = Object.create(null);
							}
							fieldsObject[field.name] = files;
							if (ii === lastIteration) return resolve(fieldsObject);
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

	private async writeFiles(multipartFiles: InterceptorFile[]): Promise<InterceptorFile[]> {
		return new Promise(async (resolve, reject) => {
			if (multipartFiles.length === 0) return resolve([]);
			const files: InterceptorFile[] = [];
			const lastIteration = multipartFiles.length - 1;
			for await (const [ii, multipart] of multipartFiles.entries()) {
				try {
					const file = await this.writeFile(multipart);
					files.push(file);
				} catch (err) {
					return reject(err);
				}
				if (ii === lastIteration) return resolve(files);
			}
		});
	}

	private async getFileFields(req: any, options?: MultipartOptions): Promise<Record<string, InterceptorFile> | undefined> {
		if (req.body) return req.body;
		const file = await req.file(options || this.options);
		return file.fields;
	}

	private async getFilesFields(req: any, options?: MultipartOptions): Promise<Record<string, InterceptorFile[]>> {
		if (req.body) return req.body;
		const filesAsyncGenerator = await req.files(options || this.options);
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
