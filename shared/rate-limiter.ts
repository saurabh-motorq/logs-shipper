/* tslint:disable:typedef */
import bottleneck from "bottleneck";
import * as logger from "./logger";
import config from "./config";

function getMutexLimiter() {
	const limiter = new bottleneck({
		maxConcurrent: 1,
		minTime : 1000
	});

	limiter.on("error", (error) => {
		logger.trackEvent({ name: "Bottleneck error" });
		logger.trackException({ exception: error });
	});

	return limiter;
}

export {getMutexLimiter };
