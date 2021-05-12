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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMutexLimiter = void 0;
/* tslint:disable:typedef */
const bottleneck_1 = __importDefault(require("bottleneck"));
const logger = __importStar(require("./logger"));
function getMutexLimiter() {
    const limiter = new bottleneck_1.default({
        maxConcurrent: 1,
        minTime: 1000
    });
    limiter.on("error", (error) => {
        logger.trackEvent({ name: "Bottleneck error" });
        logger.trackException({ exception: error });
    });
    return limiter;
}
exports.getMutexLimiter = getMutexLimiter;
//# sourceMappingURL=rate-limiter.js.map