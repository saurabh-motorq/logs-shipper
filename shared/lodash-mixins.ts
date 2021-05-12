/* tslint:disable:typedef */
import  * as lodash from "lodash";

interface LoDashMixins extends lodash.LoDashStatic {
	isDefined(value: any)
	isDefinedAndNotNull(value: any)
	repeatAsync(fn: any, timeout: number)
	repeat(fn: any, timeout: number)
	repeatAsyncJob(value: any, timeout: number)
	repeatJob(value: any, timeout: number)
	sleep(timeoutMs: number)
	objectArrayDifference<T>(array: T[], other: T[], fieldsToCompare: any)
	secondsToHours(seconds: number): number;
	secondsToMinutes(seconds: number): number;
	equalsIgnoreCase(value1: string, value2: string);
	removeWhitespace(text: string): string;
}

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
})

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

function objectArrayDifference(array, other, fieldsToCompare) {// checks if 'array' has any extra entities not present in 'other'
	let arrayCopy1 = array || [];
	let arrayCopy2 = other || [];

	arrayCopy1 = lodash.orderBy(arrayCopy1, fieldsToCompare);
	arrayCopy2 = lodash.orderBy(arrayCopy2, fieldsToCompare);

	const isEqual = ((thisObj: object, thatObj: object) => {
		return lodash.isEqual(lodash.pick(thisObj, fieldsToCompare), lodash.pick(thatObj, fieldsToCompare));
	});

	return lodash.differenceWith(arrayCopy1, arrayCopy2, isEqual);
}

function equalsIgnoreCase(value1, value2) {
	if (value1 && value2) {
		return value1.toUpperCase() === value2.toUpperCase()
	}
	return false;
}

function removeWhitespace(text): string {
	return text.replace(/\s+/g, '');
}

function secondsToHours(seconds) {
	return seconds / (60 * 60);
}

function secondsToMinutes(seconds) {
	return seconds / 60;
}

export const _ = (lodash as any) as LoDashMixins;
