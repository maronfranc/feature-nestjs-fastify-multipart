import * as path from 'path';
import * as fs from 'fs';
import { CallHandler, ExecutionContext, Inject, mixin, NestInterceptor, Optional, Type } from '@nestjs/common';
import { Observable } from 'rxjs';
import { MULTIPART_MODULE_OPTIONS } from '../files.constants';
import { transformException } from '../multipart/multipart.utils';
import { MultipartOptions } from '../interfaces/multipart-options.interface';
import { multipartExceptions } from '../multipart/multipart.constants';
import { MultipartService } from '../Multipart.service';

export const AnyFilesInterceptor = (
	localOptions?: MultipartOptions,
): Type<NestInterceptor> => {
	class MixinInterceptor implements NestInterceptor {
		protected options: MultipartOptions;
		protected multipart: MultipartService;

		public constructor(
			@Optional()
			@Inject(MULTIPART_MODULE_OPTIONS)
			options: MultipartOptions = {}
		) {
			this.multipart = new MultipartService({
				...options,
				...localOptions
			});
		}

		public async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
			const req = context.switchToHttp().getRequest();
			try {
				await this.multipart.any()(req);
			} catch (err) {
				throw transformException(err);
			}
			return next.handle();
		}
	}

	const Interceptor = mixin(MixinInterceptor);
	return Interceptor as Type<NestInterceptor>;
};
