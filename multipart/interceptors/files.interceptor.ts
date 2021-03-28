
import { CallHandler, ExecutionContext, Inject, mixin, NestInterceptor, Optional, Type } from '@nestjs/common';
import { Observable } from 'rxjs';
import { MULTIPART_MODULE_OPTIONS } from '../files.constants';
import { transformException } from '../multipart/multipart.utils';
import { MultipartOptions } from '../interfaces/multipart-options.interface';
import { MultipartService } from '../Multipart.service';


export const FilesInterceptor = (
	fieldName: string,
	maxCount?: number,
	localOptions?: MultipartOptions,
): Type<NestInterceptor> => {
	class MixinInterceptor implements NestInterceptor {
		protected multipart: MultipartService;

		public constructor(
			@Optional()
			@Inject(MULTIPART_MODULE_OPTIONS)
			options: MultipartOptions = {}
		) {
			this.multipart = new MultipartService({
				...options,
				...localOptions,
			});
		}

		public async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
			const req = context.switchToHttp().getRequest();
			try {
				req[fieldName] = await this.multipart.files(fieldName, maxCount)(req);;
			} catch (err) {
				throw transformException(err);
			}
			return next.handle();
		}
	}

	const Interceptor = mixin(MixinInterceptor);
	return Interceptor as Type<NestInterceptor>;
};
