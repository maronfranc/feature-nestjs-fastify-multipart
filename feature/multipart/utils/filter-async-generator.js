"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.filterAsyncGenerator = void 0;
const tslib_1 = require("tslib");
function filterAsyncGenerator(asyncGenerator, filter) {
    return tslib_1.__asyncGenerator(this, arguments, function* filterAsyncGenerator_1() {
        var e_1, _a;
        const values = [];
        try {
            for (var asyncGenerator_1 = tslib_1.__asyncValues(asyncGenerator), asyncGenerator_1_1; asyncGenerator_1_1 = yield tslib_1.__await(asyncGenerator_1.next()), !asyncGenerator_1_1.done;) {
                const value = asyncGenerator_1_1.value;
                const isAccepted = yield tslib_1.__await(filter(value));
                if (!isAccepted)
                    continue;
                values.push(value);
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (asyncGenerator_1_1 && !asyncGenerator_1_1.done && (_a = asyncGenerator_1.return)) yield tslib_1.__await(_a.call(asyncGenerator_1));
            }
            finally { if (e_1) throw e_1.error; }
        }
        for (const value of values) {
            yield yield tslib_1.__await(value);
        }
    });
}
exports.filterAsyncGenerator = filterAsyncGenerator;
