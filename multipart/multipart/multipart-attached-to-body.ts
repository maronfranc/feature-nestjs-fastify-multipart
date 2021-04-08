import { randomStringGenerator } from '@nestjs/common/utils/random-string-generator.util';
import * as fs from 'fs';
import * as path from 'path';
import { InterceptorDiskFile, InterceptorFile, MultipartFile, MultipartOptions, UploadField } from '../interfaces';
import { BaseMultipartWrapper } from './base-multipart-wrapper.interface';
import { multipartExceptions } from './multipart.constants';

type FastityRequest = any;

export class MultipartAttachedToBody implements BaseMultipartWrapper {
	public constructor(protected options: MultipartOptions) { }

	public file(fieldname: string) {
		return async (req: FastityRequest): Promise<InterceptorFile | undefined> => {
			return new Promise(async (resolve, reject) => {
				try {
					const fieldFile = req.body;
					const multipartFile: MultipartFile = fieldFile[fieldname];
					if (!multipartFile) return resolve(undefined);
					if (this.options.fileFilter) {
						this.options.fileFilter(req, multipartFile, (err, acceptFile) => {
							if (err) return reject(err);
							if (!acceptFile) return resolve(undefined);
						});
					}
					if (!this.options.dest) return resolve(multipartFile);
					await fs.promises.mkdir(this.options.dest, { recursive: true });
					const file = await this.writeFile(multipartFile);
					return resolve(file);
				} catch (err) {
					return reject(err);
				}
			});
		}
	}

	public files(fieldname: string, maxCount?: number) {
		return async (req: FastityRequest): Promise<InterceptorFile[] | undefined> => {
			return new Promise(async (resolve, reject) => {
				const options = { ...this.options };
				if (maxCount) {
					options.limits = {
						...options.limits,
						files: maxCount
					};
				}
				try {
					const multipartFileFields = req.body;
					const fieldFiles: InterceptorFile | InterceptorFile[] = multipartFileFields[fieldname];
					let multipartFiles: InterceptorFile[] = Array.isArray(fieldFiles) ? fieldFiles : [fieldFiles];
					if (options.fileFilter) {
						multipartFiles = this.filterFiles(req, multipartFiles);
					}
					if (multipartFiles.length === 0) return resolve(undefined);
					if (!options.dest) return resolve(multipartFiles);
					await fs.promises.mkdir(options.dest, { recursive: true });
					const files = await this.writeFiles(multipartFiles);
					return resolve(files);
				} catch (err) {
					return reject(err);
				}
			});
		}
	}

	public any() {
		return async (req: FastityRequest): Promise<InterceptorFile[] | undefined> => {
			return new Promise(async (resolve, reject) => {
				try {
					const fields = req.body;
					const multipartFilesValues = Object.values<MultipartFile | MultipartFile[]>(fields);
					let multipartFiles: MultipartFile[] = ([] as MultipartFile[]).concat(...multipartFilesValues);
					if (this.options.fileFilter) {
						multipartFiles = this.filterFiles(req, multipartFiles);
					}
					if (multipartFiles.length === 0) return resolve(undefined);
					if (!this.options.dest) return resolve(multipartFiles);
					await fs.promises.mkdir(this.options.dest, { recursive: true });
					const files = await this.writeFiles(multipartFiles);
					return resolve(files);
				} catch (err) {
					return reject(err);
				}
			});
		}
	}

	public fileFields(uploadFields: UploadField[]) {
		return async (req: FastityRequest): Promise<Record<string, InterceptorFile[]> | undefined> => {
			return new Promise(async (resolve, reject) => {
				try {
					const multipartFields: Record<string, InterceptorFile> = req.body
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
					let fieldsObject: Record<string, InterceptorFile[]> | undefined;
					for (const [ii, field] of uploadFields.entries()) {
						const fieldFile: MultipartFile | MultipartFile[] | undefined = multipartFields[field.name];
						if (!fieldFile || field.maxCount === 0) {
							if (ii === lastIteration) return resolve(fieldsObject);
							continue
						};
						let multipartFiles: MultipartFile[] = Array.isArray(fieldFile) ? fieldFile : [fieldFile];
						if (this.options.fileFilter) {
							multipartFiles = this.filterFiles(req, multipartFiles);
						}
						if (multipartFiles.length === 0) {
							if (ii === lastIteration) return resolve(fieldsObject);
							continue;
						};
						if (multipartFiles.length > field.maxCount) {
							return reject({
								message: multipartExceptions.FST_FILES_LIMIT
							});
						}
						if (!this.options.dest) {
							if (!fieldsObject) {
								fieldsObject = Object.create(null);
							}
							fieldsObject[field.name] = multipartFiles;
							if (ii === lastIteration) return resolve(fieldsObject);
							continue;
						}
						if (ii === 0) {
							await fs.promises.mkdir(this.options.dest, { recursive: true });
						}
						const files = await this.writeFiles(multipartFiles);
						if (!fieldsObject) {
							fieldsObject = Object.create(null);
						}
						fieldsObject[field.name] = files;
						if (ii === lastIteration) return resolve(fieldsObject);
					}
				} catch (err) {
					return reject(err);
				}
			});
		}
	}

	private async writeFile(file: MultipartFile): Promise<InterceptorDiskFile> {
		const multipartFile = { ...file } as InterceptorDiskFile;
		const filename = multipartFile.filename;
		const extension = path.extname(multipartFile.filename);
		multipartFile.originalname = filename;
		multipartFile.filename = randomStringGenerator() + extension;
		const filePath = path.join(this.options.dest, multipartFile.filename);
		await fs.promises.writeFile(filePath, multipartFile._buf);
		multipartFile.size = Buffer.byteLength(multipartFile._buf);
		return multipartFile;
	}

	private async writeFiles(multipartFiles: MultipartFile[]): Promise<InterceptorDiskFile[]> {
		return new Promise(async (resolve, reject) => {
			if (multipartFiles.length === 0) return resolve([]);
			const files: InterceptorDiskFile[] = [];
			const lastIteration = multipartFiles.length - 1;
			for (const [ii, multipart] of multipartFiles.entries()) {
				try {
					const file = await this.writeFile(multipart);
					files.push(file);
					if (ii === lastIteration) return resolve(files);
				} catch (err) {
					return reject(err);
				}
			}
		});
	}

	private filterFiles(req: FastityRequest, multipartFiles: InterceptorFile[]): InterceptorFile[] {
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
