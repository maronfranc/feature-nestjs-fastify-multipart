"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformException = void 0;
const common_1 = require("@nestjs/common");
const multipart_constants_1 = require("./multipart.constants");
function transformException(err) {
    if (!err || err instanceof common_1.HttpException) {
        return err;
    }
    switch (err.message) {
        case multipart_constants_1.multipartExceptions.FST_PARTS_LIMIT:
        case multipart_constants_1.multipartExceptions.FST_FILES_LIMIT:
        case multipart_constants_1.multipartExceptions.FST_FIELDS_LIMIT:
        case multipart_constants_1.multipartExceptions.FST_REQ_FILE_TOO_LARGE:
            return new common_1.PayloadTooLargeException(err.message);
        case multipart_constants_1.multipartExceptions.FST_INVALID_MULTIPART_CONTENT_TYPE:
            return new common_1.NotAcceptableException(err.message);
        case multipart_constants_1.multipartExceptions.FST_PROTO_VIOLATION:
        case multipart_constants_1.multipartExceptions.LIMIT_UNEXPECTED_FILE:
            return new common_1.BadRequestException(err.message);
    }
    if (err instanceof Error) {
        return new common_1.InternalServerErrorException(err.message);
    }
    return err;
}
exports.transformException = transformException;
