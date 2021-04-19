import { InterceptorFile, MultipartOptions, UploadField } from '../interfaces';
export declare class MultipartWrapper {
    private options;
    constructor(options: MultipartOptions);
    file(fieldname: string): (req: any) => Promise<InterceptorFile | undefined>;
    files(fieldname: string, maxCount?: number): (req: any) => Promise<InterceptorFile[] | undefined>;
    any(): (req: any) => Promise<InterceptorFile[] | undefined>;
    fileFields(uploadFields: UploadField[]): (req: any) => Promise<Record<string, InterceptorFile[]> | undefined>;
    private writeFile;
    private endStream;
}
