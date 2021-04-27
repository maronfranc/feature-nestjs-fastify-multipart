export declare function filterAsyncGenerator<T, TReturn = any, TNext = unknown>(asyncGenerator: AsyncGenerator<T, TReturn, TNext>, filter: (value: T) => Promise<boolean>): AsyncGenerator<T, void, unknown>;