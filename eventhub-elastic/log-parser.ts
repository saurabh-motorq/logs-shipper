function getFormattedLog(log) {
    const logArray = log.split(',');
    const log_timestamp = logArray[0] + '.000Z';
    const appServiceName = logArray[2];
    const instanceId = logArray[3];
    let message,
        name,
        value,
        responseCode,
        result,
        target,
        durationMs,
        fullUrl,
        baseUrl,
        path,
        method;
    let webjobName = null;
    let logType = null;
    let logJson = (logArray.slice(8).join(','));
    logJson = logJson.replace(/"+{/g, '{');
    logJson = logJson.replace(/}"+/g, '}');
    logJson = logJson.replace(/"+/g, '"');
    logJson = logJson.replace(/\\+"/g, '\"');
    logJson = logJson.replace(/"+/g, '"');
    logJson = logJson.replace(/\\n/g, '');
    logJson = logJson.replace(/\\t/g, '');
    if (logJson && logJson[0] == '"') {
        logJson = logJson.substring(1);
    }
    if (logJson.endsWith('",')) {
        logJson = logJson.substring(0, logJson.length - 2)
    }
    if (logJson.endsWith('},')) {
        logJson = logJson.substring(0, logJson.length - 1)
    }
    try {
        ({
            message,
            logType,
            webjobName,
            name,
            value,
            responseCode,
            result,
            target,
            durationMs,
            fullUrl,
            baseUrl,
            path,
            method
        } = parseAccordingToLogType(logJson));
    } catch (error) {
        console.log(error);
    }
    if (!logType) {
        logType = getLogType(logJson)
    }
    return {
        log_timestamp, 
        type: logType, 
        appServiceName, 
        webjobName, 
        message: logJson,
        name,
        value,
        responseCode,
        result,
        target,
        durationMs,
        fullUrl,
        baseUrl,
        path,
        method,
        instanceId
    }
}

function parseAccordingToLogType(logJson) {
    const parsedLog = JSON.parse(logJson);
    let message = null;
    let name = null;
    let value = null;
    let responseCode = null;
    let result = null;
    let target = null;
    let durationMs = null;
    let fullUrl = null;
    let baseUrl = null;
    let path = null;
    let method = null;
    const webjobName = parsedLog.appName;
    const logType = parsedLog.logType;
    message = parsedLog.message;
    if (logType == 'metric') {
        name = parsedLog.name;
        value = parsedLog.value;
    }
    else if (logType == 'remoteDependency' && parsedLog.name && parsedLog.resultCode) {
        ({ responseCode, result, target, durationMs, fullUrl, baseUrl, path, method } = parsrRemoteDep(parsedLog))
    }
    else if (logType == 'event') {
        name = parsedLog.name;
    }
    return {
        message,
        logType,
        webjobName,
        name,
        value,
        responseCode,
        result,
        target,
        durationMs,
        fullUrl,
        baseUrl,
        path,
        method
    }
}

function parsrRemoteDep(log) {
    return {
        responseCode: log.resultCode,
        target : log.target,
        result: log.success ? 'success' : 'failed',
        durationMs: log.durationMs,
        fullUrl: decodeURI(log.data),
        baseUrl: log.target,
        path: decodeURI(log.name.split(' ')[1]),
        method: log.name.split(' ')[0],
    }
}

function getLogType(log) {
    if (log.indexOf('trace') > log.length - 12) {
        return 'trace';
    }
    else if (log.indexOf('metric') > log.length - 12) {
        return 'metric';
    }
    else if (log.indexOf('event') > log.length - 10) {
        return 'event';
    }
    else if (log.indexOf('remoteDependency') > log.length - 20) {
        return 'remoteDependency';
    }
    else if (log.indexOf('exception') > log.length - 15) {
        return 'exception';
    }
    return 'trace';
}


export { getFormattedLog }