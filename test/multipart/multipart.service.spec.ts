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
		(fs as any).mkdir = (path: string, options: any, callback: () => any) => {
			return callback();
		}
		(fs as any).createWriteStream = (path: string) => new PassThrough();
	});
	after(() => {
		sinon.restore();
	});

	const objectFieldname = 'file';
	const arrayFieldname = 'files';
	let fileObject: any = {};
	let filesArray: any[] = [];
	let multipartFiles: any = {};
	async function* getMultipartIterator() {
		while (true) {
			yield multipartFiles;
		}
	}
	let req: any = {};
	const mockReadable = new Readable({
		read(size) {
			this.push(null);
		}
	});

	beforeEach(() => {
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
			(fs as any).createWriteStream = (path: string) => new PassThrough();
			const createWriteStreamStub = sinon.spy(fs, 'createWriteStream');
			const options: MultipartOptions = {
				dest: "upload/test"
			};
			const multipart = new MultipartWrapper(options);
			const file = await (multipart as any).writeFile(fileObject);
			expect(createWriteStreamStub.called).to.be.true;
			const filePath = path.join(options.dest, file.filename);
			expect(createWriteStreamStub.calledWith(filePath)).to.be.true
		});
	});

	describe('writeFiles', () => {
		it('should call writeFile() with expected params', async () => {
			const multipart = new MultipartWrapper({});
			const writeFileStub = sinon.stub(multipart, <any>'writeFile');
			await (multipart as any).writeFiles(filesArray);
			expect(writeFileStub.called).to.be.true;
			expect(writeFileStub.getCall(0).args).to.eql([filesArray[0]]);
			expect(writeFileStub.getCall(1).args).to.eql([filesArray[1]]);
		});
	});

	describe('file', () => {
		it('should call file() with expected params', async () => {
			const fieldName = 'file';
			const multipart = new MultipartWrapper({});
			const fileSpy = sinon
				.stub(multipart, 'file')
				.returns(async () => new Promise(() => { }));
			multipart.file(fieldName);

			expect(fileSpy.called).to.be.true;
			expect(fileSpy.calledWith(fieldName)).to.be.true;
		});

		it('should call req.file() with expected params', async () => {
			const fieldname = 'file';
			const options: MultipartOptions = {
				limits: {
					fieldSize: 10,
				},
			}
			const reqSpy = sinon
				.stub(req, 'file')
				.returns(fileObject);
			const multipart = new MultipartWrapper(options);
			await multipart.file(fieldname)(req);
			expect(reqSpy.called).to.be.true;
			expect(reqSpy.calledWith(options)).to.be.true;
		});

		it('should not call writeFile() if dest is undefined', async () => {
			const multipart = new MultipartWrapper({});
			const writeFileStub = sinon.stub(multipart, <any>'writeFile');
			await multipart.file(objectFieldname)(req);
			expect(writeFileStub.called).to.be.false;
		});

		it('should call writeFile() with expected params if dest is defined', async () => {
			const options: MultipartOptions = {
				dest: 'upload/test',
			}
			const multipart = new MultipartWrapper(options);
			const writeFilesStub = sinon.stub(multipart, <any>'writeFile').returns(fileObject);
			await multipart.file(objectFieldname)(req);
			expect(writeFilesStub.called).to.be.true;
			expect(writeFilesStub.calledWith(fileObject.fields[objectFieldname])).to.be.true;
		});

		it('should return undefined if fileFilter callback is (null, false)', async () => {
			const options: MultipartOptions = {
				fileFilter: (req, file, cb) => cb(null, false)
			}
			const multipart = new MultipartWrapper(options);
			const file = await multipart.file(objectFieldname)(req);
			expect(file).to.be.undefined;
		});

		it('should throw error if fileFilter callback is (Error, Boolean)', async () => {
			const errorMessage = 'Expect fileFilter test to throw error';
			const errorStatus = HttpStatus.BAD_REQUEST;
			const options: MultipartOptions = {
				fileFilter: (req, file, cb) => cb(new HttpException(errorMessage, errorStatus), false)
			}
			const multipart = new MultipartWrapper(options);
			try {
				await multipart.file(objectFieldname)(req);
			} catch (err) {
				expect(err.status).to.equal(errorStatus);
				expect(err.response).to.equal(errorMessage);
				expect(err instanceof HttpException).to.be.true;
			}
		});
	});

	describe('files', () => {
		it('should call files() with expected params', async () => {
			const fieldName = 'files';
			const maxCount = 10;
			const multipart = new MultipartWrapper({});
			const filesStub = sinon
				.stub(multipart, 'files')
				.returns(async () => new Promise(() => { }));
			multipart.files(fieldName, maxCount)({});

			expect(filesStub.called).to.be.true;
			expect(filesStub.calledWith(fieldName, maxCount)).to.be.true;
		});

		it('should call req.files() with expected options', async () => {
			const maxCount = 10;
			const options: MultipartOptions = {
				limits: {},
			}
			const multipart = new MultipartWrapper(options);
			const reqStub = sinon
				.stub(req, 'files');
			multipart.files(arrayFieldname, maxCount)(req);

			expect(reqStub.called).to.be.true;
			expect(reqStub.calledWith({
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
			const maxCount = 10;
			const writeFilesStub = sinon.stub(multipart, <any>'writeFiles');
			await multipart.files(arrayFieldname, maxCount)(req);
			expect(writeFilesStub.called).to.be.false;
		});

		it('should call writeFiles() with expected params if dest is defined', async () => {
			const options: MultipartOptions = {
				dest: 'upload/test',
			}
			const multipart = new MultipartWrapper(options);
			const maxCount = 10;
			const writeFilesStub = sinon.stub(multipart, <any>'writeFiles');
			await multipart.files(arrayFieldname, maxCount)(req);
			expect(writeFilesStub.called).to.be.true;
			expect(writeFilesStub.calledWith(multipartFiles.fields[arrayFieldname])).to.be.true;
		});

		it('should return undefined if fileFilter callback is (null, false)', async () => {
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

		it('should throw error if fileFilter callback is (Error, Boolean)', async () => {
			const errorMessage = 'Expect fileFilter test to throw error';
			const errorStatus = HttpStatus.BAD_REQUEST;
			const options: MultipartOptions = {
				fileFilter: (req, file, cb) => cb(new HttpException(errorMessage, errorStatus), false)
			}
			const multipart = new MultipartWrapper(options);
			try {
				await multipart.files(arrayFieldname)(req);
			} catch (err) {
				expect(err.status).to.equal(errorStatus);
				expect(err.response).to.equal(errorMessage);
				expect(err instanceof HttpException).to.be.true;
			}
		});
	});

	describe('any', () => {
		it('should call req.files() with expected options', async () => {
			const options: MultipartOptions = {
				limits: {},
			}
			const multipart = new MultipartWrapper(options);
			const reqStub = sinon
				.stub(req, 'files')
				.returns(getMultipartIterator());
			await multipart.any()(req);
			expect(reqStub.called).to.be.true;
			expect(reqStub.calledWith({
				...options,
			})).to.be.true;
		});

		it('should not call writeFile() nor writeFiles() if dest is undefined', async () => {
			const multipart = new MultipartWrapper({
				dest: undefined
			});
			const writeFileStub = sinon.stub(multipart, <any>'writeFile');
			const writeFilesStub = sinon.stub(multipart, <any>'writeFiles');
			await multipart.any()(req);
			expect(writeFileStub.called).to.be.false;
			expect(writeFilesStub.called).to.be.false;
		});

		it('should call writeFiles() with expected params if dest is defined', async () => {
			const options: MultipartOptions = {
				dest: 'upload/test',
			}
			const multipart = new MultipartWrapper(options);
			const writeFilesStub = sinon.stub(multipart, <any>'writeFiles').returns(filesArray);
			await multipart.any()(req);
			expect(writeFilesStub.called).to.be.true;
			const reqFilesData: any = await getMultipartIterator().next();
			const multipartFilesValues = Object.values<InterceptorFile | InterceptorFile[]>(reqFilesData.value.fields);
			const flatMultipartFiles: InterceptorFile[] = ([] as InterceptorFile[]).concat(...multipartFilesValues);
			expect(writeFilesStub.calledWith(flatMultipartFiles)).to.be.true;
		});

		it('should return undefined if fileFilter callback is (null, false)', async () => {
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

		it('should throw error if fileFilter callback is (Error, Boolean)', async () => {
			const errorMessage = 'Expect fileFilter test to throw error';
			const errorStatus = HttpStatus.BAD_REQUEST;
			const options: MultipartOptions = {
				fileFilter: (req, file, cb) => cb(new HttpException(errorMessage, errorStatus), false)
			}
			const multipart = new MultipartWrapper(options);
			try {
				await multipart.any()(req);
			} catch (err) {
				expect(err.status).to.equal(errorStatus);
				expect(err.response).to.equal(errorMessage);
				expect(err instanceof HttpException).to.be.true;
			}
		});
	});

	describe('fileFields', () => {
		it('should call req.files() with expected options', async () => {
			const options: MultipartOptions = {
				limits: {},
			}
			const multipart = new MultipartWrapper(options);
			const reqStub = sinon
				.stub(req, 'files')
				.returns(getMultipartIterator());
			await multipart.fileFields([
				{ name: arrayFieldname, maxCount: 10 },
				{ name: objectFieldname, maxCount: 10 },
			])(req);
			expect(reqStub.called).to.be.true;
			expect(reqStub.calledWith({
				...options,
			})).to.be.true;
		});

		it('should not call writeFiles() if dest is undefined', async () => {
			const multipart = new MultipartWrapper({
				dest: undefined
			});
			const writeFilesStub = sinon.stub(multipart, <any>'writeFiles').returns(filesArray);
			await multipart.fileFields([
				{ name: arrayFieldname, maxCount: 10 },
				{ name: objectFieldname, maxCount: 10 },
			])(req);
			expect(writeFilesStub.called).to.be.false;
		});

		it('should call writeFiles() with expected params when if is defined', async () => {
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

		it('should return undefined if fileFilter callback is (null, false)', async () => {
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
			// const fileToOmit: InterceptorFile = filesArray[1];
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

		it('should throw error if fileFilter callback is (Error, Boolean)', async () => {
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
				expect(err.status).to.equal(errorStatus);
				expect(err.response).to.equal(errorMessage);
				expect(err instanceof HttpException).to.be.true;
			}
		});

		it('should throw exception if field is missing', async () => {
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

	// describe('filterFiles', () => {
	// 	it('should', async () => {
	// 		const multipart = new MultipartWrapper({});
	// 		const filterFilesSpy = sinon.spy()
	// 		await (multipart as any).filterFiles(req, multipartFiles);
	// 	});
	// });
});


