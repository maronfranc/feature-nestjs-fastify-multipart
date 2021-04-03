import * as chai from 'chai';
import * as sinon from 'sinon';
import * as fs from 'fs';
import * as path from "path";
import { MultipartOptions } from '../../multipart/interfaces/multipart-options.interface';
import { MultipartWrapper } from '../../multipart/Multipart.service';
import { Readable, Writable, PassThrough } from 'stream';
import { InterceptorFile } from '../../multipart/interfaces/multipart-file.interface';

const { expect } = chai;
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

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

	describe('writeFile', () => {
		const fieldname = 'file';
		let multipartFile: any = {}
		let req: any = {};

		beforeEach(() => {
			const mockReadable = new Readable({
				read(size) {
					this.push(null);
				}
			});
			multipartFile = {
				fieldname,
				filename: 'test.png',
				encoding: '7bit',
				mimetype: 'image/png',
				file: mockReadable,
				fields: {},
			};
			multipartFile.fields[fieldname] = multipartFile;
			req = {
				file: async (options: MultipartOptions) => multipartFile,
			};
		});

		it('should call fs.createWriteStream() with expected params', async () => {
			(fs as any).createWriteStream = (path: string) => new PassThrough();
			const createWriteStreamStub = sinon.spy(fs, 'createWriteStream');
			const options: MultipartOptions = {
				dest: "upload/test"
			};
			const multipart = new MultipartWrapper(options);
			const file = await (multipart as any).writeFile(multipartFile);
			expect(createWriteStreamStub.called).to.be.true;
			const filePath = path.join(options.dest, file.filename);
			expect(createWriteStreamStub.calledWith(filePath)).to.be.true
		});
	});

	describe('writeFiles', () => {
		const fieldname = 'files';
		let multipartFilesMock: any = [];
		let multipartFiles: any = {};
		async function* getMultipartIterator() {
			while (true) {
				yield multipartFiles;
			}
		}
		let req: any = {};

		beforeEach(() => {
			multipartFilesMock = [
				{
					fieldname,
					filename: 'test.png',
					encoding: '7bit',
					mimetype: 'image/png',
					file: new Readable(),
					fields: {},
				},
				{
					fieldname,
					filename: 'test2.png',
					encoding: '7bit',
					mimetype: 'image/png',
					file: new Readable(),
					fields: {},
				}
			];
			multipartFiles = {
				fields: {
					[fieldname]: multipartFilesMock
				},
			}
			req = {
				files: async (options: MultipartOptions) => getMultipartIterator(),
			}
		});

		it('should call writeFile() with expected params', async () => {
			const multipart = new MultipartWrapper({});
			const writeFileStub = sinon.stub(multipart, <any>'writeFile');
			await (multipart as any).writeFiles(multipartFilesMock);
			expect(writeFileStub.called).to.be.true;
			expect(writeFileStub.getCall(0).args).to.eql([multipartFilesMock[0]]);
			expect(writeFileStub.getCall(1).args).to.eql([multipartFilesMock[1]]);
		});
	});

	describe('file', () => {
		const fieldname = 'file';
		let multipartFile: any = {}
		let req: any = {};

		beforeEach(() => {
			multipartFile = {
				fieldname,
				filename: 'test.png',
				encoding: '7bit',
				mimetype: 'image/png',
				file: new Readable(),
				fields: {},
			};
			multipartFile.fields[fieldname] = multipartFile;
			req = {
				file: async (options: MultipartOptions) => multipartFile,
			};
		});

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
				.returns(multipartFile);
			const multipart = new MultipartWrapper(options);
			await multipart.file(fieldname)(req);
			expect(reqSpy.called).to.be.true;
			expect(reqSpy.calledWith(options)).to.be.true;
		});

		it('should not call writeFile() if dest is undefined', async () => {
			const multipart = new MultipartWrapper({});
			const writeFileStub = sinon.stub(multipart, <any>'writeFile');
			await multipart.file(fieldname)(req);
			expect(writeFileStub.called).to.be.false;
		});

		it('should call writeFile() with expected params if dest is defined', async () => {
			const options: MultipartOptions = {
				dest: 'upload/test',
			}
			const multipart = new MultipartWrapper(options);
			const writeFilesStub = sinon.stub(multipart, <any>'writeFile').returns(multipartFile);
			await multipart.file(fieldname)(req);
			expect(writeFilesStub.called).to.be.true;
			expect(writeFilesStub.calledWith(multipartFile.fields[fieldname])).to.be.true;
		});

		// it('should filter files if options.fileFilter() is defined', async () => { })
	});

	describe('files', () => {
		const fieldname = 'files';
		let multipartFilesMock: any = [];
		let multipartFiles: any = {};
		async function* getMultipartIterator() {
			while (true) {
				yield multipartFiles;
			}
		}
		let req: any = {};

		beforeEach(() => {
			multipartFilesMock = [
				{
					fieldname,
					filename: 'test.png',
					encoding: '7bit',
					mimetype: 'image/png',
					file: new Readable(),
					fields: {},
				},
				{
					fieldname,
					filename: 'test2.png',
					encoding: '7bit',
					mimetype: 'image/png',
					file: new Readable(),
					fields: {},
				}
			];
			multipartFiles = {
				fields: {
					[fieldname]: multipartFilesMock
				},
			}
			req = {
				files: async (options: MultipartOptions) => getMultipartIterator(),
			}
		});

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
			const fieldname = 'files';
			const maxCount = 10;
			const options: MultipartOptions = {
				limits: {},
			}
			const multipart = new MultipartWrapper(options);
			const req = {
				files: async (options: MultipartOptions) => { },
			};
			const multipartFilesGenerator: any = {
				next: () => { }
			};
			const reqStub = sinon
				.stub(req, 'files')
				.returns(multipartFilesGenerator);
			multipart.files(fieldname, maxCount)(req);

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
			await multipart.files(fieldname, maxCount)(req);
			expect(writeFilesStub.called).to.be.false;
		});

		it('should call writeFiles() with expected params if dest is defined', async () => {
			const options: MultipartOptions = {
				dest: 'upload/test',
			}
			const multipart = new MultipartWrapper(options);
			const maxCount = 10;
			const writeFilesStub = sinon.stub(multipart, <any>'writeFiles');
			await multipart.files(fieldname, maxCount)(req);
			expect(writeFilesStub.called).to.be.true;
			expect(writeFilesStub.calledWith(multipartFiles.fields[fieldname])).to.be.true;
		});
	});

	describe('any', () => {
		const arrayFieldname = 'files';
		const objectFieldname = 'file';
		let filesArray: any[] = [];
		let fileObject: any = {};
		let multipartFiles: any = {};
		async function* getMultipartIterator() {
			while (true) {
				yield multipartFiles;
			}
		}
		let req: any = {};

		beforeEach(() => {
			filesArray = [
				{
					fieldname: arrayFieldname,
					filename: 'test.png',
					encoding: '7bit',
					mimetype: 'image/png',
					file: new Readable(),
					fields: {},
				},
				{
					fieldname: arrayFieldname,
					filename: 'test2.png',
					encoding: '7bit',
					mimetype: 'image/png',
					file: new Readable(),
					fields: {},
				}
			];
			fileObject = {
				fieldname: arrayFieldname,
				filename: 'test3.png',
				encoding: '7bit',
				mimetype: 'image/png',
				file: new Readable(),
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
				files: async (options: MultipartOptions) => getMultipartIterator(),
			};
		});

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
	});

	describe('fileFields', () => {
		const arrayFieldname = 'files';
		const objectFieldname = 'file';
		let filesArray: any[] = [];
		let fileObject: any = {};
		let multipartFiles: any = {};
		async function* getMultipartIterator() {
			while (true) {
				yield multipartFiles;
			}
		}
		let req: any = {};

		beforeEach(() => {
			filesArray = [
				{
					fieldname: arrayFieldname,
					filename: 'test.png',
					encoding: '7bit',
					mimetype: 'image/png',
					file: new Readable(),
					fields: {},
				},
				{
					fieldname: arrayFieldname,
					filename: 'test2.png',
					encoding: '7bit',
					mimetype: 'image/png',
					file: new Readable(),
					fields: {},
				}
			];
			fileObject = {
				fieldname: arrayFieldname,
				filename: 'test5.png',
				encoding: '7bit',
				mimetype: 'image/png',
				file: new Readable(),
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
				files: async (options: MultipartOptions) => getMultipartIterator(),
			};
		});

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

		// it('should throw exception if file exceed maxCount', async () => {
		// 	const options: MultipartOptions = {
		// 		dest: 'upload/test',
		// 	}
		// 	const multipart = new MultipartWrapper(options);
		// 	const reqFilesData: any = await getMultipartIterator().next();
		// 	const testFiles = reqFilesData.value.fields[arrayFieldname];
		// 	delete reqFilesData.value.fields;
		// 	reqFilesData.value.fields = {
		// 		[arrayFieldname]: testFiles
		// 	};
		// 	const writeFilesStub = sinon.stub(multipart, <any>'writeFiles');
		// 	// const multipartSpy = sinon.spy(multipart, 'fileFields');
		// 	const maxCount = testFiles.length - 1;
		// 	// expect(multipart.fileFields([
		// 	// 	{ name: arrayFieldname, maxCount },
		// 	// ])(req)).to.eventually.throw();
		// 	// expect(writeFilesStub.called).to.be.false;
		// 	// expect(multipartSpy).to.have.throw();
		// 	try {
		// 		await multipart.fileFields([
		// 			{ name: arrayFieldname, maxCount: 1 },
		// 		])(req)
		// 	} catch (err) {
		// 	}
		// 	// expect().to.throw();
		// 	// expect(writeFilesStub.called).to.be.true;
		// 	// expect(writeFilesStub.throws).to.be.true;
		// 	// expect(writeFilesStub.calledWith([testFiles[0]])).to.be.true;
		// });
	});

	// describe('filterFiles', () => {
	// 	const arrayFieldname = 'files';
	// 	const objectFieldname = 'file';
	// 	let filesArray: any[] = [];
	// 	let fileObject: any = {};
	// 	let multipartFiles: any = {};
	// 	async function* getMultipartIterator() {
	// 		while (true) {
	// 			yield multipartFiles;
	// 		}
	// 	}
	// 	let req: any = {};

	// 	beforeEach(() => {
	// 		filesArray = [
	// 			{
	// 				fieldname: arrayFieldname,
	// 				filename: 'test.png',
	// 				encoding: '7bit',
	// 				mimetype: 'image/png',
	// 				file: new Readable(),
	// 				fields: {},
	// 			},
	// 			{
	// 				fieldname: arrayFieldname,
	// 				filename: 'test2.png',
	// 				encoding: '7bit',
	// 				mimetype: 'image/png',
	// 				file: new Readable(),
	// 				fields: {},
	// 			}
	// 		];
	// 		fileObject = {
	// 			fieldname: arrayFieldname,
	// 			filename: 'test5.png',
	// 			encoding: '7bit',
	// 			mimetype: 'image/png',
	// 			file: new Readable(),
	// 			fields: {},
	// 		}
	// 		fileObject.fields[objectFieldname] = fileObject;
	// 		multipartFiles = {
	// 			fields: {
	// 				[arrayFieldname]: filesArray,
	// 				[objectFieldname]: fileObject
	// 			},
	// 		}
	// 		req = {
	// 			files: async (options: MultipartOptions) => getMultipartIterator(),
	// 		};
	// 	});

	// 	it('should', async () => {
	// 		const multipart = new MultipartWrapper({});
	// 		const filterFilesSpy = sinon.spy()
	// 		await (multipart as any).filterFiles(req, multipartFiles);
	// 	});
	// });
});


