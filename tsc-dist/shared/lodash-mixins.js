"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports._ = void 0;
/* tslint:disable:typedef */
const lodash = __importStar(require("lodash"));
lodash.mixin({
    isDefined,
    isDefinedAndNotNull,
    repeatAsync,
    repeat,
    repeatAsyncJob,
    repeatJob,
    sleep,
    objectArrayDifference,
    secondsToHours,
    secondsToMinutes,
    equalsIgnoreCase,
    removeWhitespace
});
function isDefined(value) {
    return typeof (value) !== "undefined";
}
function isDefinedAndNotNull(value) {
    return typeof (value) !== "undefined" && value !== null;
}
async function repeatAsync(fn, timeout) {
    setTimeout(async () => {
        await fn();
        repeatAsync(fn, timeout);
    }, timeout);
}
async function repeat(fn, timeout) {
    setTimeout(() => {
        fn();
        repeat(fn, timeout);
    }, timeout);
}
async function repeatAsyncJob(fn, timeout) {
    setTimeout(async () => {
        const canRepeat = await fn();
        if (canRepeat) {
            repeatAsyncJob(fn, timeout);
        }
    }, timeout);
}
async function repeatJob(fn, timeout) {
    setTimeout(() => {
        const canRepeat = fn();
        if (canRepeat) {
            repeatJob(fn, timeout);
        }
    }, timeout);
}
async function sleep(timeoutMs) {
    return new Promise(resolve => {
        setTimeout(resolve, timeoutMs);
    });
}
function objectArrayDifference(array, other, fieldsToCompare) {
    let arrayCopy1 = array || [];
    let arrayCopy2 = other || [];
    arrayCopy1 = lodash.orderBy(arrayCopy1, fieldsToCompare);
    arrayCopy2 = lodash.orderBy(arrayCopy2, fieldsToCompare);
    const isEqual = ((thisObj, thatObj) => {
        return lodash.isEqual(lodash.pick(thisObj, fieldsToCompare), lodash.pick(thatObj, fieldsToCompare));
    });
    return lodash.differenceWith(arrayCopy1, arrayCopy2, isEqual);
}
function equalsIgnoreCase(value1, value2) {
    if (value1 && value2) {
        return value1.toUpperCase() === value2.toUpperCase();
    }
    return false;
}
function removeWhitespace(text) {
    return text.replace(/\s+/g, '');
}
function secondsToHours(seconds) {
    return seconds / (60 * 60);
}
function secondsToMinutes(seconds) {
    return seconds / 60;
}
exports._ = lodash;
//# sourceMappingURL=lodash-mixins.js.map