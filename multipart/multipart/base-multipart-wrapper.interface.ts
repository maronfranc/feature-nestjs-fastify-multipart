import { InterceptorFile } from "../interfaces/multipart-file.interface";
import { UploadField } from "../interfaces/multipart-options.interface";

export interface BaseMultipartWrapper {
    file: (fieldname: string) => (req: any) => Promise<InterceptorFile | undefined>;
    files: (fieldname: string, maxCount?: number) => (req: any) => Promise<InterceptorFile[] | undefined>;
    any: () => (req: any) => Promise<InterceptorFile[] | undefined>;
    fileFields: (uploadFields: UploadField[]) => (req: any) => Promise<Record<string, InterceptorFile[]> | undefined>
}