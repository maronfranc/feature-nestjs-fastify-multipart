"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileFieldsInterceptor = void 0;
const tslib_1 = require("tslib");
const common_1 = require("@nestjs/common");
const files_constants_1 = require("../files.constants");
const multipart_1 = require("../multipart");
const FileFieldsInterceptor = (uploadFields, localOptions) => {
    let MixinInterceptor = class MixinInterceptor {
        constructor(options = {}) {
            this.multipart = new multipart_1.MultipartWrapper(Object.assign(Object.assign({}, options), localOptions));
        }
        async intercept(context, next) {
            const req = context.switchToHttp().getRequest();
            const fieldname = 'files';
            try {
                req[fieldname] = await this.multipart.fileFields(uploadFields)(req);
            }
            catch (err) {
                throw multipart_1.transformException(err);
            }
            return next.handle();
        }
    };
    MixinInterceptor = tslib_1.__decorate([
        tslib_1.__param(0, common_1.Optional()),
        tslib_1.__param(0, common_1.Inject(files_constants_1.MULTIPART_MODULE_OPTIONS)),
        tslib_1.__metadata("design:paramtypes", [Object])
    ], MixinInterceptor);
    const Interceptor = common_1.mixin(MixinInterceptor);
    return Interceptor;
};
exports.FileFieldsInterceptor = FileFieldsInterceptor;
