import { randomStringGenerator } from '@nestjs/common/utils/random-string-generator.util';
import * as fs from 'fs';
import path from 'path';
import { InterceptorDiskFile, InterceptorFile, MultipartFile } from '../interfaces/multipart-file.interface';
import { MultipartOptions, UploadField } from '../interfaces/multipart-options.interface';
import { BaseMultipartWrapper } from './base-multipart-wrapper.interface';
import { multipartExceptions } from './multipart.constants';

async function* filterAsyncGenerator<T, TReturn = any, TNext = unknown>(
	asyncGenerator: AsyncGenerator<T, TReturn, TNext>,
	options: {
		/** return true to add value into generator */
		filter: (value: T) => boolean,
		/** all value that returned false can be accessed here */
		onValueNotAccepted?: (refusedValue: T) => void
	}
) {
	const { filter, onValueNotAccepted } = options;
	for await (const value of asyncGenerator) {
		const isAccepted = filter(value);
		if (!isAccepted) {
			if (onValueNotAccepted) {
				onValueNotAccepted(value);
			}
			continue;
		}
		yield value;
	}
}

type FastityRequest = any;

export class MultipartRequestWrapper implements BaseMultipartWrapper {
	public constructor(protected options: MultipartOptions) { }

	public file(fieldname: string) {
		return async (req: FastityRequest): Promise<InterceptorFile | undefined> => {
			return new Promise(async (resolve, reject) => {
				try {
					const fieldFile = await req.file(this.options);
					const multipartFile = fieldFile[fieldname];
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
				const files: InterceptorFile[] = [];
				try {
					const filesGenerator: AsyncGenerator<MultipartFile> = await req.files(options);
					const filteredFileGenerator = filterAsyncGenerator<MultipartFile>(filesGenerator, {
						filter: (multipartFile) => {
							if (multipartFile.fieldname !== fieldname) return false;
							if (!multipartFile) return false;
							if (options.fileFilter) {
								let isFileAccepted = false;
								options.fileFilter(req, multipartFile, (err, acceptFile) => {
									if (err) throw err;
									isFileAccepted = acceptFile;
								});
								return isFileAccepted;
							}
							return true;
						},
						onValueNotAccepted: (multipartFile) => {
							multipartFile.file.emit('end');
						}
					});
					for await (let multipartFile of filteredFileGenerator) {
						if (options.dest) {
							await fs.promises.mkdir(options.dest, { recursive: true });
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
					const filteredFileGenerator = filterAsyncGenerator<MultipartFile>(filesGenerator, {
						filter: (multipartFile) => {
							if (!multipartFile) return false;
							let isFileAccepted = false;
							this.options.fileFilter(req, multipartFile, (err, acceptFile) => {
								if (err) throw err;
								isFileAccepted = acceptFile;
							});
							return isFileAccepted;
						},
						onValueNotAccepted: (multipartFile) => {
							multipartFile.file.emit('end');
						}
					});
					const files: InterceptorFile[] = [];
					for await (let multipartFile of filteredFileGenerator) {
						if (this.options.dest) {
							await fs.promises.mkdir(this.options.dest, { recursive: true });
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
					const filteredFileGenerator = filterAsyncGenerator<MultipartFile>(filesGenerator, {
						filter: (multipartFile) => {
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
							let isFileAccepted = false;
							this.options.fileFilter(req, multipartFile, (err, acceptFile) => {
								if (err) throw err;
								isFileAccepted = acceptFile;
							});
							return isFileAccepted;
						},
						onValueNotAccepted: (multipartFile) => {
							multipartFile.file.emit('end');
						}
					});
					let isFirstIteration = true;
					let fieldsObject: Record<string, InterceptorFile[]> | undefined;
					for await (const multipartFile of filteredFileGenerator) {
						const indexOfUploadField = uploadFieldKeys.indexOf(multipartFile.fieldname);
						const field = uploadFields[indexOfUploadField];
						let file: InterceptorFile = multipartFile as InterceptorFile;
						if (this.options.dest) {
							if (isFirstIteration) {
								isFirstIteration = false;
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
