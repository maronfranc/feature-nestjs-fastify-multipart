export interface InterceptorDiskFile extends MultipartFile {
    originalname: string;
    size: number;
}

interface MultipartFields {
    [x: string]: InterceptorDiskFile | InterceptorDiskFile[];
}

export interface MultipartFile {
    toBuffer: () => Promise<Buffer>;
    file: NodeJS.ReadStream;
    filepath: string;
    fieldname: string;
    filename: string;
    encoding: string;
    mimetype: string;
    _buf?: Buffer;
    fields: MultipartFields;
}

export type InterceptorFile = MultipartFile | InterceptorDiskFile;