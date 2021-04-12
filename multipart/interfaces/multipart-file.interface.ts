export interface InterceptorDiskFile extends MultipartFile {
  path: string;
  destination: string;
}

interface MultipartFields {
  [x: string]: FastifyMultipartFile | FastifyMultipartFile[];
}

export interface FastifyMultipartFile {
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

export interface MultipartFile extends FastifyMultipartFile {
  originalname: string;
  size: number;
}

export type InterceptorFile = MultipartFile | InterceptorDiskFile;
