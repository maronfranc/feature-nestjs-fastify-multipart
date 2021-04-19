"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultipartWrapper = void 0;
const tslib_1 = require("tslib");
const fs = require("fs");
const path = require("path");
const random_string_generator_util_1 = require("@nestjs/common/utils/random-string-generator.util");
const utils_1 = require("../utils");
const multipart_constants_1 = require("./multipart.constants");
class MultipartWrapper {
    constructor(options) {
        this.options = options;
    }
    file(fieldname) {
        return async (req) => {
            return new Promise(async (resolve, reject) => {
                try {
                    const reqFile = await req.file(this.options);
                    let multipartFile = reqFile.fields[fieldname];
                    if (Array.isArray(multipartFile)) {
                        multipartFile = multipartFile[0];
                    }
                    if (!multipartFile)
                        throw new Error(multipart_constants_1.multipartExceptions.LIMIT_UNEXPECTED_FILE);
                    if (typeof this.options.fileFilter === 'function') {
                        let isFileAccepted = true;
                        this.options.fileFilter(req, multipartFile, (err, acceptFile) => {
                            if (err)
                                throw err;
                            isFileAccepted = acceptFile;
                        });
                        if (!isFileAccepted)
                            return resolve(undefined);
                    }
                    // TODO: add typeof  === "string"
                    if (!this.options.dest) {
                        multipartFile = await this.endStream(multipartFile);
                        return resolve(multipartFile);
                    }
                    if (!fs.existsSync(this.options.dest)) {
                        await fs.promises.mkdir(this.options.dest, { recursive: true });
                    }
                    const file = await this.writeFile(multipartFile);
                    return resolve(file);
                }
                catch (err) {
                    return reject(err);
                }
            });
        };
    }
    files(fieldname, maxCount) {
        return async (req) => {
            return new Promise(async (resolve, reject) => {
                var e_1, _a;
                const options = Object.assign({}, this.options);
                if (maxCount) {
                    options.limits = Object.assign(Object.assign({}, options.limits), { files: maxCount });
                }
                const files = [];
                try {
                    const filesGenerator = await req.files(options);
                    const filteredFileGenerator = utils_1.filterAsyncGenerator(filesGenerator, async (multipartFile) => {
                        // emit 'end' signalling that this iteration will not consume file stream
                        multipartFile.file.emit('end');
                        if (multipartFile.fieldname !== fieldname)
                            return false;
                        if (!multipartFile)
                            return false;
                        let isFileAccepted = true;
                        if (typeof options.fileFilter === 'function') {
                            options.fileFilter(req, multipartFile, (err, acceptFile) => {
                                if (err)
                                    throw err;
                                isFileAccepted = acceptFile;
                            });
                        }
                        return isFileAccepted;
                    });
                    try {
                        for (var filteredFileGenerator_1 = tslib_1.__asyncValues(filteredFileGenerator), filteredFileGenerator_1_1; filteredFileGenerator_1_1 = await filteredFileGenerator_1.next(), !filteredFileGenerator_1_1.done;) {
                            let multipartFile = filteredFileGenerator_1_1.value;
                            if (options.dest) {
                                if (!fs.existsSync(options.dest)) {
                                    await fs.promises.mkdir(options.dest, { recursive: true });
                                }
                                multipartFile = await this.writeFile(multipartFile);
                            }
                            else {
                                multipartFile = await this.endStream(multipartFile);
                            }
                            files.push(multipartFile);
                        }
                    }
                    catch (e_1_1) { e_1 = { error: e_1_1 }; }
                    finally {
                        try {
                            if (filteredFileGenerator_1_1 && !filteredFileGenerator_1_1.done && (_a = filteredFileGenerator_1.return)) await _a.call(filteredFileGenerator_1);
                        }
                        finally { if (e_1) throw e_1.error; }
                    }
                    return resolve(files.length === 0 ? undefined : files);
                }
                catch (err) {
                    return reject(err);
                }
            });
        };
    }
    any() {
        return async (req) => {
            return new Promise(async (resolve, reject) => {
                var e_2, _a;
                try {
                    const filesGenerator = await req.files(this.options);
                    const filteredFileGenerator = utils_1.filterAsyncGenerator(filesGenerator, async (multipartFile) => {
                        // emit 'end' signalling that this iteration will not consume file stream
                        multipartFile.file.emit('end');
                        if (!multipartFile)
                            return false;
                        let isFileAccepted = true;
                        if (typeof this.options.fileFilter === 'function') {
                            this.options.fileFilter(req, multipartFile, (err, acceptFile) => {
                                if (err)
                                    throw err;
                                isFileAccepted = acceptFile;
                            });
                        }
                        return isFileAccepted;
                    });
                    const files = [];
                    try {
                        for (var filteredFileGenerator_2 = tslib_1.__asyncValues(filteredFileGenerator), filteredFileGenerator_2_1; filteredFileGenerator_2_1 = await filteredFileGenerator_2.next(), !filteredFileGenerator_2_1.done;) {
                            let multipartFile = filteredFileGenerator_2_1.value;
                            if (this.options.dest) {
                                if (!fs.existsSync(this.options.dest)) {
                                    await fs.promises.mkdir(this.options.dest, { recursive: true });
                                }
                                multipartFile = await this.writeFile(multipartFile);
                            }
                            else {
                                multipartFile = await this.endStream(multipartFile);
                            }
                            files.push(multipartFile);
                        }
                    }
                    catch (e_2_1) { e_2 = { error: e_2_1 }; }
                    finally {
                        try {
                            if (filteredFileGenerator_2_1 && !filteredFileGenerator_2_1.done && (_a = filteredFileGenerator_2.return)) await _a.call(filteredFileGenerator_2);
                        }
                        finally { if (e_2) throw e_2.error; }
                    }
                    return resolve(files.length === 0 ? undefined : files);
                }
                catch (err) {
                    return reject(err);
                }
            });
        };
    }
    fileFields(uploadFields) {
        return async (req) => {
            return new Promise(async (resolve, reject) => {
                var e_3, _a;
                try {
                    const filesGenerator = await req.files(this.options);
                    const uploadFieldKeys = uploadFields.map(uploadField => uploadField.name);
                    const filteredFileGenerator = utils_1.filterAsyncGenerator(filesGenerator, async (multipartFile) => {
                        // emit 'end' signalling that this iteration will not consume file stream
                        multipartFile.file.emit('end');
                        const indexOfUploadField = uploadFieldKeys.indexOf(multipartFile.fieldname);
                        if (indexOfUploadField === -1) {
                            throw new Error(multipart_constants_1.multipartExceptions.LIMIT_UNEXPECTED_FILE);
                        }
                        const field = uploadFields[indexOfUploadField];
                        if (multipartFile.fieldname !== field.name)
                            return false;
                        if (!field.maxCount || field.maxCount <= 0) {
                            throw new Error(multipart_constants_1.multipartExceptions.FST_FILES_LIMIT);
                        }
                        const allFilesInField = multipartFile.fields[field.name];
                        if (Array.isArray(allFilesInField) &&
                            allFilesInField.length > field.maxCount) {
                            throw new Error(multipart_constants_1.multipartExceptions.FST_FILES_LIMIT);
                        }
                        let isFileAccepted = true;
                        if (typeof this.options.fileFilter === 'function') {
                            this.options.fileFilter(req, multipartFile, (err, acceptFile) => {
                                if (err)
                                    throw err;
                                isFileAccepted = acceptFile;
                            });
                        }
                        return isFileAccepted;
                    });
                    let fieldsObject;
                    try {
                        for (var filteredFileGenerator_3 = tslib_1.__asyncValues(filteredFileGenerator), filteredFileGenerator_3_1; filteredFileGenerator_3_1 = await filteredFileGenerator_3.next(), !filteredFileGenerator_3_1.done;) {
                            const file = filteredFileGenerator_3_1.value;
                            const indexOfUploadField = uploadFieldKeys.indexOf(file.fieldname);
                            const field = uploadFields[indexOfUploadField];
                            let multipartFile = file;
                            if (this.options.dest) {
                                if (!fs.existsSync(this.options.dest)) {
                                    await fs.promises.mkdir(this.options.dest, { recursive: true });
                                }
                                multipartFile = await this.writeFile(file);
                            }
                            else {
                                multipartFile = await this.endStream(multipartFile);
                            }
                            if (!fieldsObject) {
                                fieldsObject = Object.create(null);
                            }
                            if (!fieldsObject[field.name]) {
                                fieldsObject[field.name] = [];
                            }
                            fieldsObject[field.name].push(multipartFile);
                        }
                    }
                    catch (e_3_1) { e_3 = { error: e_3_1 }; }
                    finally {
                        try {
                            if (filteredFileGenerator_3_1 && !filteredFileGenerator_3_1.done && (_a = filteredFileGenerator_3.return)) await _a.call(filteredFileGenerator_3);
                        }
                        finally { if (e_3) throw e_3.error; }
                    }
                    return resolve(fieldsObject);
                }
                catch (err) {
                    return reject(err);
                }
            });
        };
    }
    async writeFile(file) {
        return new Promise((resolve, reject) => {
            const multipartFile = Object.assign({}, file);
            const filename = multipartFile.filename;
            const extension = path.extname(filename);
            const randomFileName = random_string_generator_util_1.randomStringGenerator() + extension;
            multipartFile.originalname = filename;
            multipartFile.filename = randomFileName;
            multipartFile.destination = this.options.dest;
            const filePath = path.join(this.options.dest, randomFileName);
            multipartFile.path = filePath;
            const outStream = fs.createWriteStream(filePath);
            multipartFile.file.pipe(outStream);
            outStream.on('error', err => {
                multipartFile.file.destroy();
                return reject(err);
            });
            outStream.on('finish', () => {
                multipartFile.size = outStream.bytesWritten;
                return resolve(multipartFile);
            });
        });
    }
    async endStream(fastifyMultipart) {
        fastifyMultipart.file.emit('end');
        const multipartFile = Object.assign({}, fastifyMultipart);
        multipartFile.size = multipartFile.file.readableLength;
        multipartFile.originalname = multipartFile.filename;
        return multipartFile;
    }
}
exports.MultipartWrapper = MultipartWrapper;
