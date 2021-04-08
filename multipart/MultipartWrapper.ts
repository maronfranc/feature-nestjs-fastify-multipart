import { MultipartOptions, UploadField } from "./interfaces/multipart-options.interface";
import { InterceptorFile } from './interfaces/multipart-file.interface';
import { MultipartAttachedToBody } from "./multipart/multipart-attached-to-body";
import { BaseMultipartWrapper } from "./multipart/base-multipart-wrapper.interface";

export class MultipartWrapperTemporarilyRemoved /* implements BaseMultipartWrapper */ {
	public constructor(protected options: MultipartOptions) { }

	// public file(fieldname: string) {
	// 	return async (req: any): Promise<InterceptorFile | undefined> => {
	// 		if (req.body) {
	// 			const multipart = new MultipartAttachedToBody(this.options);
	// 			return multipart.file(fieldname)(req);
	// 		}

	// 		if (typeof req.file === "function") {
	// 			const multipart = new MultipartRequestWrapper(this.options);
	// 			return multipart.file(fieldname)(req);
	// 		}
	// 	}
	// }

	// public files(fieldname: string, maxCount?: number) {
	// 	return async (req: any): Promise<InterceptorFile[] | undefined> => {
	// 		if (req.body) {
	// 			const multipart = new MultipartAttachedToBody(this.options);
	// 			return multipart.files(fieldname, maxCount)(req);
	// 		}

	// 		if (typeof req.files === "function") {
	// 			const multipart = new MultipartRequestWrapper(this.options);
	// 			return multipart.files(fieldname, maxCount)(req);
	// 		}
	// 	}
	// }

	// public any() {
	// 	return async (req: any): Promise<InterceptorFile[]> => {
	// 		if (req.body) {
	// 			const multipart = new MultipartAttachedToBody(this.options);
	// 			return multipart.any()(req);
	// 		}

	// 		if (typeof req.files === "function") {
	// 			const multipart = new MultipartRequestWrapper(this.options);
	// 			return multipart.any()(req);
	// 		}
	// 	}
	// }

	// public fileFields(uploadFields: UploadField[]) {
	// 	return async (req: any): Promise<Record<string, InterceptorFile[]> | undefined> => {
	// 		if (req.body) {
	// 			const multipart = new MultipartAttachedToBody(this.options);
	// 			return multipart.fileFields(uploadFields)(req);
	// 		}

	// 		if (typeof req.file === "function") {
	// 			const multipart = new MultipartRequestWrapper(this.options);
	// 			return multipart.fileFields(uploadFields)(req);
	// 		}
	// 	}
	// }
}
