import { CallHandler } from '@nestjs/common';
import { expect } from 'chai';
import * as sinon from 'sinon';
import * as fs from 'fs';
import { MultipartOptions } from '../../multipart/interfaces/multipart-options.interface';
import { MultipartFile, MultipartWrapper } from '../../multipart/Multipart.service';
import { Readable } from 'stream';


describe('MultipartWrapper', () => {
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
		// it('should call fs.mkdir() with expected folder destination param', async () => {});
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

		it('should call writeFile() with expected params if dest is defined and field is an object', async () => {
			const options: MultipartOptions = {
				dest: 'upload/test',
			}
			delete multipartFiles.fields[arrayFieldname];
			const multipart = new MultipartWrapper(options);
			const writeFileStub = sinon.stub(multipart, <any>'writeFile').returns(fileObject);
			const writeFilesStub = sinon.stub(multipart, <any>'writeFiles').returns(filesArray);
			await multipart.any()(req);
			expect(writeFileStub.called).to.be.true;
			expect(writeFilesStub.called).to.be.false;
			const reqFilesData: any = await getMultipartIterator().next();
			expect(writeFileStub.calledWith(reqFilesData.value.fields[objectFieldname])).to.be.true;
		});

		it('should call writeFiles() with expected params if dest is defined and field is an array', async () => {
			const options: MultipartOptions = {
				dest: 'upload/test',
			}
			delete multipartFiles.fields[objectFieldname];
			const multipart = new MultipartWrapper(options);
			const writeFileStub = sinon.stub(multipart, <any>'writeFile').returns(fileObject);
			const writeFilesStub = sinon.stub(multipart, <any>'writeFiles').returns(filesArray);
			await multipart.any()(req);
			expect(writeFileStub.called).to.be.false;
			expect(writeFilesStub.called).to.be.true;
			const reqFilesData: any = await getMultipartIterator().next();
			expect(writeFilesStub.calledWith(reqFilesData.value.fields[arrayFieldname])).to.be.true;
		});

		it('should call writeFile() and writeFiles() with expected params if dest is defined', async () => {
			const options: MultipartOptions = {
				dest: 'upload/test',
			}
			const multipart = new MultipartWrapper(options);
			const writeFileStub = sinon.stub(multipart, <any>'writeFile').returns(fileObject);
			const writeFilesStub = sinon.stub(multipart, <any>'writeFiles').returns(filesArray);
			await multipart.any()(req);
			expect(writeFileStub.called).to.be.true;
			expect(writeFilesStub.called).to.be.true;
			const reqFilesData: any = await getMultipartIterator().next();
			expect(writeFileStub.calledWith(reqFilesData.value.fields[objectFieldname])).to.be.true;
			expect(writeFilesStub.calledWith(reqFilesData.value.fields[arrayFieldname])).to.be.true;
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
				{ name: objectFieldname, maxCount: 5 },
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
			const writeFilesStub = sinon.stub(multipart, <any>'writeFiles').returns(testFiles);
			await multipart.fileFields([
				{ name: arrayFieldname, maxCount: 10 },
			])(req);
			expect(writeFilesStub.called).to.be.true;
			expect(writeFilesStub.calledWith(testFiles)).to.be.true;
		});

		it('should files not exceed maxCount value', async () => {
			const options: MultipartOptions = {
				dest: 'upload/test',
			}
			const multipart = new MultipartWrapper(options);
			const reqFilesData: any = await getMultipartIterator().next();
			const testFiles = reqFilesData.value.fields[arrayFieldname];
			const writeFilesStub = sinon.stub(multipart, <any>'writeFiles').returns([testFiles[0]]);
			await multipart.fileFields([
				{ name: arrayFieldname, maxCount: 1 },
			])(req);
			expect(writeFilesStub.called).to.be.true;
			expect(writeFilesStub.calledWith([testFiles[0]])).to.be.true;
		});
	});
});

