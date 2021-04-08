export async function* filterAsyncGenerator<T, TReturn = any, TNext = unknown>(
    asyncGenerator: AsyncGenerator<T, TReturn, TNext>,
    options: {
        /** return true to add value into generator */
        filter: (value: T) => boolean,
        /** all value that returned false can be accessed here */
        onValueNotAccepted?: (refusedValue: T) => void
    }
) {
    const { filter, onValueNotAccepted } = options;
    const values: T[] = [];
    for await (const value of asyncGenerator) {
        const isAccepted = filter(value);
        if (!isAccepted) {
            if (onValueNotAccepted) {
                onValueNotAccepted(value);
            }
            continue;
        }
        values.push(value);
    }
    for (const value of values) {
        yield value;
    }
}