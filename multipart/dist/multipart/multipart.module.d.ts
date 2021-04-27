import { DynamicModule } from '@nestjs/common';
import { MultipartModuleAsyncOptions, MultipartModuleOptions } from './interfaces/files-upload-module.interface';
export declare class MultipartModule {
    static register(options?: MultipartModuleOptions): DynamicModule;
    static registerAsync(options: MultipartModuleAsyncOptions): DynamicModule;
    private static createAsyncProviders;
    private static createAsyncOptionsProvider;
}
