import * as sinon from 'sinon';
import * as fs from 'fs';
import * as path from "path";
import { expect } from 'chai';
import { MultipartOptions } from '../../multipart/interfaces/multipart-options.interface';
import { MultipartWrapper } from '../../multipart/Multipart.service';
import { Readable, PassThrough } from 'stream';
import { InterceptorFile } from '../../multipart/interfaces/multipart-file.interface';
import { HttpException, HttpStatus } from '@nestjs/common';
import { multipartExceptions } from '../../multipart/multipart/multipart.constants';

describe('MultipartWrapper', () => {
	before(() => {
		sinon.createSandbox();
	});
	after(() => {
		sinon.restore();
	});

	let fileObject: any = {};
	let filesArray: any[] = [];
	let multipartFiles: any = {};
	async function* getMultipartIterator() {
		while (true) {
			yield multipartFiles;
		}
	}
	let req: any = {};
	const objectFieldname = 'single-file-fieldname';
	const arrayFieldname = 'array-files-fieldname';
	const mockReadable = new Readable({
		read(size) {
			this.push(null);
		}
	});

	beforeEach(() => {
		(fs as any).promises.mkdir = (path: string, options: any) => { }
		(fs as any).createWriteStream = (path: string) => new PassThrough();
		filesArray = [
			{
				fieldname: arrayFieldname,
				filename: 'test.png',
				encoding: '7bit',
				mimetype: 'image/png',
				file: mockReadable,
				fields: {},
			},
			{
				fieldname: arrayFieldname,
				filename: 'test2.png',
				encoding: '7bit',
				mimetype: 'image/png',
				file: mockReadable,
				fields: {},
			}
		];
		fileObject = {
			fieldname: objectFieldname,
			filename: 'test3.png',
			encoding: '7bit',
			mimetype: 'image/png',
			file: mockReadable,
			fields: {},
		}
		fileObject.fields[objectFieldname] = fileObject;
		for (const file of filesArray) {
			file.fields[arrayFieldname] = filesArray;
		}
		multipartFiles = {
			fields: {
				[arrayFieldname]: filesArray,
				[objectFieldname]: fileObject
			},
		}
		req = {
			file: async (options: MultipartOptions) => fileObject,
			files: async (options: MultipartOptions) => getMultipartIterator(),
		};
	});
	describe('writeFile', () => {
		it('should call fs.createWriteStream() with expected params', async () => {
			const options: MultipartOptions = {
				dest: "upload/test"
			};
			const multipart = new MultipartWrapper(options);
			const createWriteStreamStub = sinon.spy(fs, 'createWriteStream');
			const file = await (multipart as any).writeFile(fileObject);
			expect(createWriteStreamStub.called).to.be.true;
			const filePath = path.join(options.dest, file.filename);
			expect(createWriteStreamStub.calledWith(filePath)).to.be.true
		});
		it('should add bytesWritten number to file.size', async () => {
			const options: MultipartOptions = {
				dest: "upload/test"
			};
			const multipart = new MultipartWrapper(options);
			const bytesWritten = 1234;
			(fs as any).createWriteStream = (path: string) => {
				const mockCreateWriteStream = new PassThrough();
				(mockCreateWriteStream as any).bytesWritten = bytesWritten;
				return mockCreateWriteStream;
			};
			const file = await (multipart as any).writeFile(fileObject);
			expect(file.size).to.be.equal(bytesWritten);
		});
		it('should emit error', async () => {
			const bytesWritten = 1234;
			(fs as any).createWriteStream = (path: string) => {
				const mockCreateWriteStream = new PassThrough();
				mockCreateWriteStream.on('end', () => {
					console.log(" ----- ----- | END | ----- ----- ");
					mockCreateWriteStream.emit('error');
				});
				return mockCreateWriteStream;
			};
			const options: MultipartOptions = {
				dest: "upload/test"
			};
			const multipart = new MultipartWrapper(options);
			// const destroyStub = sinon.stub(fileObject.file, 'destroy'); 
			const file = await (multipart as any).writeFile(fileObject);
			// console.log(" ----- ----- | destroyStub | ----- ----- ", typeof destroyStub);
			// console.log(destroyStub);
			// console.log(" _____ _____ | destroyStub | _____ _____ ", typeof destroyStub);
			// expect(destroyStub.called).to.be.true;
		});
	});
	describe('writeFiles', () => {
		it('should call writeFile() with expected params', async () => {
			const multipart = new MultipartWrapper({});
			const writeFilesStub = sinon.stub(multipart, <any>'writeFile');
			await (multipart as any).writeFiles(filesArray);
			expect(writeFilesStub.called).to.be.true;
			expect(writeFilesStub.getCall(0).args).to.eql([filesArray[0]]);
			expect(writeFilesStub.getCall(1).args).to.eql([filesArray[1]]);
		});
	});
	describe('file', () => {
		it('should call mkdir with expected params', async () => {
			const options: MultipartOptions = {
				dest: "upload/test"
			};
			const multipart = new MultipartWrapper(options);
			const fsSpy = sinon.spy(fs.promises, 'mkdir');
			await multipart.file(objectFieldname)(req);
			expect(fsSpy.called).to.be.true;
			expect(fsSpy.calledWith(options.dest, { recursive: true })).to.be.true;
		});
		it('should call file() with expected params', async () => {
			const multipart = new MultipartWrapper({});
			const fileSpy = sinon.spy(multipart, 'file');
			await multipart.file(objectFieldname)(req);
			expect(fileSpy.called).to.be.true;
			expect(fileSpy.calledWith(objectFieldname)).to.be.true;
		});
		it('should call req.file() with expected params', async () => {
			const options: MultipartOptions = {
				limits: {
					fieldSize: 10,
				},
			}
			const reqSpy = sinon.spy(req, 'file');
			const multipart = new MultipartWrapper(options);
			await multipart.file(objectFieldname)(req);
			expect(reqSpy.called).to.be.true;
			expect(reqSpy.calledWith(options)).to.be.true;
		});
		it('should not call writeFile() if dest is undefined', async () => {
			const multipart = new MultipartWrapper({});
			const writeFileSpy = sinon.spy(multipart, <any>'writeFile');
			await multipart.file(objectFieldname)(req);
			expect(writeFileSpy.called).to.be.false;
		});
		it('should call writeFile() with expected params if dest is defined', async () => {
			const options: MultipartOptions = {
				dest: 'upload/test',
			}
			const multipart = new MultipartWrapper(options);
			const writeFilesSpy = sinon.spy(multipart, <any>'writeFile');
			await multipart.file(objectFieldname)(req);
			expect(writeFilesSpy.called).to.be.true;
			expect(writeFilesSpy.calledWith(fileObject.fields[objectFieldname])).to.be.true;
		});
		it('should return undefined if options.fileFilter callback is (null, false)', async () => {
			const options: MultipartOptions = {
				fileFilter: (req, file, cb) => cb(null, false)
			}
			const multipart = new MultipartWrapper(options);
			const file = await multipart.file(objectFieldname)(req);
			expect(file).to.be.undefined;
		});
		it('should throw error if options.fileFilter callback is (Error, Boolean)', async () => {
			const errorMessage = 'Expect fileFilter test to throw error';
			const errorStatus = HttpStatus.BAD_REQUEST;
			const options: MultipartOptions = {
				fileFilter: (req, file, cb) => cb(new HttpException(errorMessage, errorStatus), false)
			}
			const multipart = new MultipartWrapper(options);
			try {
				await multipart.file(objectFieldname)(req);
			} catch (err) {
				expect(err instanceof HttpException).to.be.true;
				expect(err.response).to.equal(errorMessage);
				expect(err.status).to.equal(errorStatus);
			}
		});
	});
	describe('files', () => {
		it('should call mkdir with expected params', async () => {
			const options: MultipartOptions = {
				dest: "upload/test"
			};
			const multipart = new MultipartWrapper(options);
			const fsSpy = sinon.spy(fs.promises, 'mkdir');
			await multipart.file(objectFieldname)(req);
			expect(fsSpy.called).to.be.true;
			expect(fsSpy.calledWith(options.dest, { recursive: true })).to.be.true;
		});
		it('should call files() with expected params', async () => {
			const multipart = new MultipartWrapper({});
			const maxCount = 10;
			const filesSpy = sinon.spy(multipart, 'files');
			await multipart.files(arrayFieldname, maxCount)(req);
			expect(filesSpy.called).to.be.true;
			expect(filesSpy.calledWith(arrayFieldname, maxCount)).to.be.true;
		});
		it('should call req.files() with expected options', async () => {
			const options: MultipartOptions = {
				limits: {},
			}
			const multipart = new MultipartWrapper(options);
			const maxCount = 10;
			const reqSpy = sinon.spy(req, 'files');
			await multipart.files(arrayFieldname, maxCount)(req);
			expect(reqSpy.called).to.be.true;
			expect(reqSpy.calledWith({
				...options,
				limits: {
					...options?.limits,
					files: maxCount
				}
			})).to.be.true;
		});
		it('should not call writeFiles() if dest is undefined', async () => {
			const multipart = new MultipartWrapper({
				dest: undefined
			});
			const writeFilesStub = sinon.stub(multipart, <any>'writeFiles');
			await multipart.files(arrayFieldname, 10)(req);
			expect(writeFilesStub.called).to.be.false;
		});
		it('should call writeFiles() with expected params if dest is defined', async () => {
			const options: MultipartOptions = {
				dest: 'upload/test',
			}
			const multipart = new MultipartWrapper(options);
			const writeFilesStub = sinon.stub(multipart, <any>'writeFiles');
			await multipart.files(arrayFieldname, 10)(req);
			expect(writeFilesStub.called).to.be.true;
			expect(writeFilesStub.calledWith(multipartFiles.fields[arrayFieldname])).to.be.true;
		});
		it('should return undefined if options.fileFilter callback is (null, false)', async () => {
			const options: MultipartOptions = {
				fileFilter: (req, file, cb) => cb(null, false)
			}
			const multipart = new MultipartWrapper(options);
			const files = await multipart.files(arrayFieldname)(req);
			expect(files).to.be.undefined;
		});
		it("should omit specific file if callback is (null, false)", async () => {
			const fileToOmit: InterceptorFile = filesArray[1];
			const options: MultipartOptions = {
				fileFilter: (req, file, cb) => {
					if (file.filename === fileToOmit.filename) {
						return cb(null, false);
					}
					cb(null, true);
				}
			}
			const multipart = new MultipartWrapper(options);
			const files = await multipart.files(arrayFieldname)(req);
			expect(files).to.not.have.members([fileToOmit]);
		});
		it('should throw error if options.fileFilter callback is (Error, Boolean)', async () => {
			const errorMessage = 'Expect fileFilter test to throw error';
			const errorStatus = HttpStatus.BAD_REQUEST;
			const options: MultipartOptions = {
				fileFilter: (req, file, cb) => cb(new HttpException(errorMessage, errorStatus), false)
			}
			const multipart = new MultipartWrapper(options);
			try {
				await multipart.files(arrayFieldname)(req);
			} catch (err) {
				expect(err instanceof HttpException).to.be.true;
				expect(err.response).to.equal(errorMessage);
				expect(err.status).to.equal(errorStatus);
			}
		});
	});
	describe('any', () => {
		it('should call mkdir with expected params', async () => {
			const options: MultipartOptions = {
				dest: "upload/test"
			};
			const multipart = new MultipartWrapper(options);
			const fsSpy = sinon.spy(fs.promises, 'mkdir');
			await multipart.file(objectFieldname)(req);
			expect(fsSpy.called).to.be.true;
			expect(fsSpy.calledWith(options.dest, { recursive: true })).to.be.true;
		});
		it('should call req.files() with expected options', async () => {
			const options: MultipartOptions = {
				limits: {},
			}
			const multipart = new MultipartWrapper(options);
			const reqSpy = sinon.spy(req, 'files');
			await multipart.any()(req);
			expect(reqSpy.called).to.be.true;
			expect(reqSpy.calledWith({
				...options,
			})).to.be.true;
		});
		it('should not call writeFile() nor writeFiles() if dest is undefined', async () => {
			const multipart = new MultipartWrapper({
				dest: undefined
			});
			const writeFileSpy = sinon.spy(multipart, <any>'writeFile');
			const writeFilesSpy = sinon.spy(multipart, <any>'writeFiles');
			await multipart.any()(req);
			expect(writeFileSpy.called).to.be.false;
			expect(writeFilesSpy.called).to.be.false;
		});
		it('should call writeFiles() with expected params if dest is defined', async () => {
			const options: MultipartOptions = {
				dest: 'upload/test',
			}
			const multipart = new MultipartWrapper(options);
			const writeFilesSpy = sinon.spy(multipart, <any>'writeFiles');
			await multipart.any()(req);
			expect(writeFilesSpy.called).to.be.true;
			const reqFilesData: any = await getMultipartIterator().next();
			const multipartFilesValues = Object.values<InterceptorFile | InterceptorFile[]>(reqFilesData.value.fields);
			const flatMultipartFiles: InterceptorFile[] = ([] as InterceptorFile[]).concat(...multipartFilesValues);
			expect(writeFilesSpy.calledWith(flatMultipartFiles)).to.be.true;
		});
		it('should return undefined if options.fileFilter callback is (null, false)', async () => {
			const options: MultipartOptions = {
				fileFilter: (req, file, cb) => cb(null, false)
			}
			const multipart = new MultipartWrapper(options);
			const files = await multipart.any()(req);
			expect(files).to.be.undefined;
		});
		it("should omit specific file if callback is (null, false)", async () => {
			const fileToOmit: InterceptorFile = filesArray[1];
			const options: MultipartOptions = {
				fileFilter: (req, file, cb) => {
					if (file.filename === fileToOmit.filename) {
						return cb(null, false);
					}
					cb(null, true);
				}
			}
			const multipart = new MultipartWrapper(options);
			const files = await multipart.any()(req);
			expect(files).to.not.have.members([fileToOmit]);
		});
		it('should throw error if options.fileFilter callback is (Error, Boolean)', async () => {
			const errorMessage = 'Expect fileFilter test to throw error';
			const errorStatus = HttpStatus.BAD_REQUEST;
			const options: MultipartOptions = {
				fileFilter: (req, file, cb) => cb(new HttpException(errorMessage, errorStatus), false)
			}
			const multipart = new MultipartWrapper(options);
			try {
				await multipart.any()(req);
			} catch (err) {
				expect(err instanceof HttpException).to.be.true;
				expect(err.response).to.equal(errorMessage);
				expect(err.status).to.equal(errorStatus);
			}
		});
	});
	describe('fileFields', () => {
		it('should call mkdir with expected params', async () => {
			const options: MultipartOptions = {
				dest: "upload/test"
			};
			const multipart = new MultipartWrapper(options);
			const fsSpy = sinon.spy(fs.promises, 'mkdir');
			await multipart.file(objectFieldname)(req);
			expect(fsSpy.called).to.be.true;
			expect(fsSpy.calledWith(options.dest, { recursive: true })).to.be.true;
		});
		it('should call req.files() with expected options', async () => {
			const options: MultipartOptions = {
				limits: {},
			}
			const multipart = new MultipartWrapper(options);
			const reqSpy = sinon.spy(req, 'files');
			await multipart.fileFields([
				{ name: arrayFieldname, maxCount: 10 },
				{ name: objectFieldname, maxCount: 10 },
			])(req);
			expect(reqSpy.called).to.be.true;
			expect(reqSpy.calledWith({
				...options,
			})).to.be.true;
		});
		it('should not call writeFiles() if dest is undefined', async () => {
			const multipart = new MultipartWrapper({
				dest: undefined
			});
			const writeFilesSpy = sinon.spy(multipart, <any>'writeFiles');
			await multipart.fileFields([
				{ name: arrayFieldname, maxCount: 10 },
				{ name: objectFieldname, maxCount: 10 },
			])(req);
			expect(writeFilesSpy.called).to.be.false;
		});
		it('should call writeFiles() with expected params when dest is defined', async () => {
			const options: MultipartOptions = {
				dest: 'upload/test',
			}
			const multipart = new MultipartWrapper(options);
			const reqFilesData: any = await getMultipartIterator().next();
			const testFiles = reqFilesData.value.fields[arrayFieldname];
			const writeFilesStub = sinon.stub(multipart, <any>'writeFiles')
				.onCall(0)
				.returns(testFiles)
				.onCall(1)
				.returns([fileObject]);
			await multipart.fileFields([
				{ name: arrayFieldname, maxCount: 10 },
				{ name: objectFieldname, maxCount: 10 },
			])(req);
			expect(writeFilesStub.called).to.be.true;
			expect(writeFilesStub.getCall(0).calledWith(testFiles)).to.be.true;
			expect(writeFilesStub.getCall(1).calledWith([fileObject])).to.be.true;
		});
		it('should return undefined if options.fileFilter callback is (null, false)', async () => {
			const options: MultipartOptions = {
				fileFilter: (req, file, cb) => cb(null, false)
			}
			const multipart = new MultipartWrapper(options);
			const files = await multipart.fileFields([
				{ name: arrayFieldname, maxCount: 10 },
				{ name: objectFieldname, maxCount: 10 },
			])(req);
			expect(files).to.be.undefined;
		});
		it("should omit specific file if callback is (null, false)", async () => {
			const multipartFiles = await getMultipartIterator().next();
			const fileToOmitInArray: InterceptorFile = multipartFiles.value.fields[arrayFieldname][1];
			const fileToOmit: InterceptorFile = multipartFiles.value.fields[objectFieldname];
			const options: MultipartOptions = {
				fileFilter: (req, file, cb) => {
					if (file.filename === fileToOmit.filename || file.filename === fileToOmitInArray.filename) {
						return cb(null, false);
					}
					cb(null, true);
				}
			}
			const multipart = new MultipartWrapper(options);
			const filesRecord = await multipart.fileFields([
				{ name: arrayFieldname, maxCount: 10 },
				{ name: objectFieldname, maxCount: 10 },
			])(req);
			expect(filesRecord[arrayFieldname]).to.not.have.members([fileToOmit]);
			expect(filesRecord[objectFieldname]).to.be.undefined;
		});
		it('should throw error if options.fileFilter callback is (Error, Boolean)', async () => {
			const errorMessage = 'Expect fileFilter test to throw error';
			const errorStatus = HttpStatus.BAD_REQUEST;
			const options: MultipartOptions = {
				fileFilter: (req, file, cb) => cb(new HttpException(errorMessage, errorStatus), false)
			}
			const multipart = new MultipartWrapper(options);
			try {
				await multipart.fileFields([
					{ name: arrayFieldname, maxCount: 10 },
					{ name: objectFieldname, maxCount: 10 },
				])(req);
			} catch (err) {
				expect(err instanceof HttpException).to.be.true;
				expect(err.response).to.equal(errorMessage);
				expect(err.status).to.equal(errorStatus);
			}
		});
		it('should throw exception if field is not listed in UploadField array', async () => {
			const multipart = new MultipartWrapper({});
			const differentFieldname = 'different-fieldname';
			multipartFiles.fields[differentFieldname] = multipartFiles.fields[arrayFieldname];
			try {
				const files = await multipart.fileFields([
					{ name: arrayFieldname, maxCount: 10 },
					{ name: objectFieldname, maxCount: 10 },
				])(req);
				expect(files).to.not.undefined;
			} catch (err) {
				expect(err.message).to.equal(multipartExceptions.LIMIT_UNEXPECTED_FILE);
			}
		});
		it('should throw exception if files exceed maxCount', async () => {
			const multipart = new MultipartWrapper({});
			const reqFilesData: any = await getMultipartIterator().next();
			const maxCount = reqFilesData.value.fields[arrayFieldname].length - 1;
			try {
				await multipart.fileFields([
					{ name: arrayFieldname, maxCount },
					{ name: objectFieldname, maxCount: 1 },
				])(req)
			} catch (err) {
				expect(err.message).to.equal(multipartExceptions.FST_FILES_LIMIT);
			}
		});
	});
	describe('getFileFields', () => {
		it('should get file from body if it is defined', async () => {
			req.body = {
				[objectFieldname]: fileObject
			};
			const reqFileSpy = sinon.spy(req, 'file');
			const multipart = new MultipartWrapper({});
			await (multipart as any).getFileFields(req);
			expect(reqFileSpy.called).to.be.false;
		});
		it('should call req.file() with expected options', async () => {
			const options: MultipartOptions = {
				dest: "upload/test"
			}
			const multipart = new MultipartWrapper(options);
			const reqFileSpy = sinon.spy(req, 'file');
			await (multipart as any).getFileFields(req, options);
			expect(reqFileSpy.called).to.be.true;
			expect(reqFileSpy.calledWith(options)).to.be.true;
		});
	});
	describe('getFilesFields', () => {
		it('should get files from body if it is defined', async () => {
			req.body = {
				[arrayFieldname]: filesArray
			};
			const reqFilesSpy = sinon.spy(req, 'files');
			const multipart = new MultipartWrapper({});
			await (multipart as any).getFilesFields(req);
			expect(reqFilesSpy.called).to.be.false;
		});
		it('should call req.files() with expected options', async () => {
			const options: MultipartOptions = {
				dest: "upload/test"
			}
			const multipart = new MultipartWrapper(options);
			const reqFilesSpy = sinon.spy(req, 'files');
			await (multipart as any).getFilesFields(req);
			expect(reqFilesSpy.called).to.be.true;
			expect(reqFilesSpy.calledWith(options)).to.be.true;
		});
	});
	describe('filterFiles', () => {
		it("should omit specific file if callback is (null, false)", async () => {
			const fileToOmit: InterceptorFile = filesArray[1];
			const options: MultipartOptions = {
				fileFilter: (req, file, cb) => {
					if (file.filename === fileToOmit.filename) {
						return cb(null, false);
					}
					cb(null, true);
				}
			}
			const multipart = new MultipartWrapper(options);
			const files = await (multipart as any).filterFiles(req, filesArray);
			expect(files).to.not.have.members([fileToOmit]);
		});
		it('should throw error if options.fileFilter callback is (Error, Boolean)', async () => {
			const errorMessage = 'Expect fileFilter test to throw error';
			const errorStatus = HttpStatus.BAD_REQUEST;
			const options: MultipartOptions = {
				fileFilter: (req, file, cb) => cb(new HttpException(errorMessage, errorStatus), false)
			}
			const multipart = new MultipartWrapper(options);
			try {
				await (multipart as any).filterFiles(req, filesArray);
			} catch (err) {
				expect(err instanceof HttpException).to.be.true;
				expect(err.response).to.equal(errorMessage);
				expect(err.status).to.equal(errorStatus);
			}
		});
	});
});


