import { randomStringGenerator } from '@nestjs/common/utils/random-string-generator.util';
import * as fs from 'fs';
import * as path from 'path';
import { InterceptorDiskFile, InterceptorFile, MultipartFile, MultipartOptions, UploadField } from '../interfaces';
import { filterAsyncGenerator } from '../utils';
import { multipartExceptions } from './multipart.constants';

type FastityRequest = any;

export class MultipartWrapper {
	public constructor(protected options: MultipartOptions) { }

	public file(fieldname: string) {
		return async (req: FastityRequest): Promise<InterceptorFile | undefined> => {
			return new Promise(async (resolve, reject) => {
				try {
					const reqFile: MultipartFile = await req.file(this.options);
					let multipartFile = reqFile.fields[fieldname];
					if (Array.isArray(multipartFile)) {
						multipartFile = multipartFile[0];
					}
					if (!multipartFile) return resolve(undefined);
					if (typeof this.options.fileFilter === 'function') {
						let isFileAccepted = true;
						this.options.fileFilter(req, multipartFile, (err, acceptFile) => {
							if (err) throw err;
							isFileAccepted = acceptFile;
						});
						if (!isFileAccepted) return resolve(undefined);
					}
					if (!this.options.dest) return resolve(multipartFile);
					if (!fs.existsSync(this.options.dest)) {
						await fs.promises.mkdir(this.options.dest, { recursive: true });
					}
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
				const files: InterceptorFile[] = [];
				try {
					const filesGenerator: AsyncGenerator<MultipartFile> = await req.files(options);
					const filteredFileGenerator = filterAsyncGenerator<MultipartFile>(filesGenerator, async (multipartFile) => {
						// emit end signalling that this iteration will not consume file stream
						multipartFile.file.emit('end');
						if (multipartFile.fieldname !== fieldname) return false;
						if (!multipartFile) return false;
						let isFileAccepted = true;
						if (typeof options.fileFilter === 'function') {
							options.fileFilter(req, multipartFile, (err, acceptFile) => {
								if (err) throw err;
								isFileAccepted = acceptFile;
							});
						}
						return isFileAccepted;
					});
					for await (let multipartFile of filteredFileGenerator) {
						if (options.dest) {
							if (!fs.existsSync(options.dest)) {
								await fs.promises.mkdir(options.dest, { recursive: true });
							}
							multipartFile = await this.writeFile(multipartFile);
						} else {
							multipartFile.file.emit('end');
						}
						files.push(multipartFile);
					}
					return resolve(files.length === 0 ? undefined : files);
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
					const filesGenerator: AsyncGenerator<MultipartFile> = await req.files(this.options);
					const filteredFileGenerator = filterAsyncGenerator<MultipartFile>(filesGenerator, async (multipartFile) => {
						// emit end signalling that this iteration will not consume file stream
						multipartFile.file.emit('end');
						if (!multipartFile) return false;
						if (typeof this.options.fileFilter === 'function') {
							let isFileAccepted = false;
							this.options.fileFilter(req, multipartFile, (err, acceptFile) => {
								if (err) throw err;
								isFileAccepted = acceptFile;
							});
							return isFileAccepted;
						}
						return true;
					});
					const files: InterceptorFile[] = [];
					for await (let multipartFile of filteredFileGenerator) {
						if (this.options.dest) {
							if (!fs.existsSync(this.options.dest)) {
								await fs.promises.mkdir(this.options.dest, { recursive: true });
							}
							multipartFile = await this.writeFile(multipartFile);
						} else {
							multipartFile.file.emit('end');
						}
						files.push(multipartFile);
					}
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
					const filesGenerator: AsyncGenerator<MultipartFile> = await req.files(this.options);
					const uploadFieldKeys = uploadFields.map((uploadField) => uploadField.name);
					const filteredFileGenerator = filterAsyncGenerator<MultipartFile>(filesGenerator, async (multipartFile) => {
						// emit end signalling that this iteration will not consume file stream
						multipartFile.file.emit('end');
						const indexOfUploadField = uploadFieldKeys.indexOf(multipartFile.fieldname);
						if (indexOfUploadField === -1) {
							throw new Error(multipartExceptions.LIMIT_UNEXPECTED_FILE);
						};
						const field = uploadFields[indexOfUploadField];
						if (field.maxCount <= 0) return false;
						if (multipartFile.fieldname !== field.name) return false;
						const allFilesInField = multipartFile.fields[field.name];
						if (Array.isArray(allFilesInField) && allFilesInField.length > field.maxCount) {
							throw new Error(multipartExceptions.FST_FILES_LIMIT);
						}
						if (typeof this.options.fileFilter === 'function') {
							let isFileAccepted = false;
							this.options.fileFilter(req, multipartFile, (err, acceptFile) => {
								if (err) throw err;
								isFileAccepted = acceptFile;
							});
							return isFileAccepted;
						}
						return true;
					});
					let fieldsObject: Record<string, InterceptorFile[]> | undefined;
					for await (const multipartFile of filteredFileGenerator) {
						const indexOfUploadField = uploadFieldKeys.indexOf(multipartFile.fieldname);
						const field = uploadFields[indexOfUploadField];
						let file: InterceptorFile = multipartFile as InterceptorFile;
						if (this.options.dest) {
							if (!fs.existsSync(this.options.dest)) {
								await fs.promises.mkdir(this.options.dest, { recursive: true });
							}
							file = await this.writeFile(multipartFile);
						} else {
							multipartFile.file.emit('end');
						}
						if (!fieldsObject) {
							fieldsObject = Object.create(null);
						}
						if (!fieldsObject[field.name]) {
							fieldsObject[field.name] = [];
						}
						fieldsObject[field.name].push(file);
					}
					return resolve(fieldsObject);
				} catch (err) {
					return reject(err);
				}
			});
		}
	}

	private async writeFile(file: MultipartFile): Promise<InterceptorDiskFile> {
		return new Promise((resolve, reject) => {
			const multipartFile = { ...file } as InterceptorDiskFile;
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
}
