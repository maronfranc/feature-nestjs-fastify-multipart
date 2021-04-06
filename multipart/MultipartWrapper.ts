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
        return async (req: any): Promise<InterceptorFile[] | undefined> => {
            return new Promise<InterceptorFile[]>(async (resolve, reject) => {
                const options = { ...this.options };
                if (maxCount) {
                    options.limits = {
                        ...options.limits,
                        files: maxCount
                    };
                }
                const files: InterceptorFile[] = [];
                const filesIterator = await req.files(options);
                let isFirstIteration = true;
                for await (let multipartFile of filesIterator) {
                    if (multipartFile.fieldname !== fieldname) {
                        multipartFile.file.emit('end');
                        continue;
                    };
                    // if (options.fileFilter) {
                    // 	multipartFile = this.filterFiles(req, multipartFile);
                    // }
                    // if (!multipartFile) {
                    // 	multipartFile.file.emit('end');
                    // 	continue;
                    // };
                    if (isFirstIteration) {
                        isFirstIteration = false;
                        await fs.promises.mkdir(options.dest, { recursive: true });
                    }
                    const file = await this.writeFile(multipartFile);
                    files.push(file);
                }
                return resolve(files);
            });
        }
    }

    public any() {
        return async (req: any): Promise<InterceptorFile[]> => {
            return new Promise<InterceptorFile[] | undefined>(async (resolve, reject) => {
                try {
                    const files: InterceptorFile[] = [];
                    const parts = await req.files(this.options);
                    await fs.promises.mkdir(this.options.dest, { recursive: true });
                    for await (const part of parts) {
                        const file = await this.writeFile(part);
                        files.push(file);
                    }
                    return resolve(files);
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
                    const parts: Generator<InterceptorFile> = await req.files(this.options);
                    let fieldsObject: Record<string, InterceptorFile[]> | undefined;
                    for await (const multipartFile of parts) {
                        // this.validateUploadFields(uploadFields, multipartFile);
                        const uploadFieldKeys = uploadFields.map((uploadField) => uploadField.name);
                        const multipartFieldEntries = Object.entries(multipartFile.fields);
                        for await (const [ii, [multipartFieldKey, multipartFile]] of multipartFieldEntries.entries()) {
                            const indexOfUploadField = uploadFieldKeys.indexOf(multipartFieldKey);
                            if (indexOfUploadField === -1) {
                                throw new Error(multipartExceptions.LIMIT_UNEXPECTED_FILE);
                            };
                            const isLastIteration = multipartFieldEntries[ii + 1] === undefined;
                            const field = uploadFields[indexOfUploadField];
                            const fileIsNotInUploadFields =
                                !Array.isArray(multipartFile) &&
                                !multipartFile.fields[field.name] ||
                                Array.isArray(multipartFile) &&
                                !multipartFile[0].fields[field.name];
                            if (fileIsNotInUploadFields) {
                                if (isLastIteration) return resolve(fieldsObject);
                                continue;
                            }
                            let multipartFiles = Array.isArray(multipartFile) ? multipartFile : [multipartFile];
                            if (this.options.fileFilter) {
                                multipartFiles = this.filterFiles(req, multipartFiles);
                            }
                            if (multipartFiles.length === 0) {
                                if (isLastIteration) return resolve(fieldsObject);
                                continue;
                            };
                            if (multipartFiles.length > field.maxCount) {
                                throw new Error(multipartExceptions.FST_FILES_LIMIT);
                            }
                            if (!this.options.dest) {
                                if (!fieldsObject) {
                                    fieldsObject = Object.create(null);
                                }
                                fieldsObject[field.name] = multipartFiles;
                                for (const multipartFile of multipartFiles) {
                                    multipartFile.file.emit('end');
                                }
                                if (isLastIteration) return resolve(fieldsObject);
                                continue;
                            }
                            if (ii === 0) {
                                await fs.promises.mkdir(this.options.dest, { recursive: true });
                            }
                            if (!fieldsObject) {
                                fieldsObject = Object.create(null);
                            }
                            const files = await this.writeFiles(multipartFiles);
                            fieldsObject[field.name] = files;
                            if (isLastIteration) return resolve(fieldsObject);
                        }
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
                // TODO: arr[ii + 1] === undefined === hasNext();
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
