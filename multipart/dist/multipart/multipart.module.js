"use strict";
var MultipartModule_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultipartModule = void 0;
const tslib_1 = require("tslib");
const common_1 = require("@nestjs/common");
const random_string_generator_util_1 = require("@nestjs/common/utils/random-string-generator.util");
const files_constants_1 = require("./files.constants");
const multipart_constants_1 = require("./multipart.constants");
let MultipartModule = MultipartModule_1 = class MultipartModule {
    static register(options = {}) {
        return {
            module: MultipartModule_1,
            providers: [
                { provide: files_constants_1.MULTIPART_MODULE_OPTIONS, useValue: options },
                {
                    provide: multipart_constants_1.MULTIPART_MODULE_ID,
                    useValue: random_string_generator_util_1.randomStringGenerator(),
                },
            ],
            exports: [files_constants_1.MULTIPART_MODULE_OPTIONS],
        };
    }
    static registerAsync(options) {
        return {
            module: MultipartModule_1,
            imports: options.imports,
            providers: [
                ...this.createAsyncProviders(options),
                {
                    provide: multipart_constants_1.MULTIPART_MODULE_ID,
                    useValue: random_string_generator_util_1.randomStringGenerator(),
                },
            ],
            exports: [files_constants_1.MULTIPART_MODULE_OPTIONS],
        };
    }
    static createAsyncProviders(options) {
        if (options.useExisting || options.useFactory) {
            return [this.createAsyncOptionsProvider(options)];
        }
        return [
            this.createAsyncOptionsProvider(options),
            {
                provide: options.useClass,
                useClass: options.useClass,
            },
        ];
    }
    static createAsyncOptionsProvider(options) {
        if (options.useFactory) {
            return {
                provide: files_constants_1.MULTIPART_MODULE_OPTIONS,
                useFactory: options.useFactory,
                inject: options.inject || [],
            };
        }
        return {
            provide: files_constants_1.MULTIPART_MODULE_OPTIONS,
            useFactory: async (optionsFactory) => optionsFactory.createMultipartOptions(),
            inject: [options.useExisting || options.useClass],
        };
    }
};
MultipartModule = MultipartModule_1 = tslib_1.__decorate([
    common_1.Module({})
], MultipartModule);
exports.MultipartModule = MultipartModule;
