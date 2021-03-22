export const multipartExceptions = {
    FST_PARTS_LIMIT: 'reach parts limit',
    FST_FILES_LIMIT: 'reach files limit',
    FST_FIELDS_LIMIT: 'reach fields limit',
    FST_REQ_FILE_TOO_LARGE: 'request file too large, please check multipart config',
    FST_PROTO_VIOLATION: 'prototype property is not allowed as field name',
    FST_INVALID_MULTIPART_CONTENT_TYPE: 'the request is not multipart',
    // multer exception
    LIMIT_UNEXPECTED_FILE: 'Unexpected field',
    NODE_MKDIR: "DEV_TEST_MKDIR_ERROR",
    NODE_WRITE_FILE: "DEV_TEST_WRITE_FILE_ERROR",
} as const;

export type MultipartKey = keyof typeof multipartExceptions;