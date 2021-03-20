import {
	BadRequestException,
	HttpException,
	NotAcceptableException,
	PayloadTooLargeException,
} from '@nestjs/common';
import { multipartExceptions } from './multipart.constants';

export function transformException(error: Error | undefined) {
	if (!error || error instanceof HttpException) {
		return error;
	}
	switch (error as any) {
		case multipartExceptions.FST_PARTS_LIMIT:
		case multipartExceptions.FST_FILES_LIMIT:
		case multipartExceptions.FST_FIELDS_LIMIT:
		case multipartExceptions.FST_REQ_FILE_TOO_LARGE:
			return new PayloadTooLargeException(error.message);
		case multipartExceptions.FST_INVALID_MULTIPART_CONTENT_TYPE:
			return new NotAcceptableException(error.message);
		case multipartExceptions.FST_PROTO_VIOLATION:
		case multipartExceptions.LIMIT_UNEXPECTED_FILE:
			return new BadRequestException(error.message);
	}
	return error;
}
