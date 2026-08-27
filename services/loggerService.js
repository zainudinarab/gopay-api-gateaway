// Logger Service - System & Activity Logs Management
const activityLogs = [];

function logActivity(level, message, detail = null) {
    const timestamp = new Date().toISOString();
    const logItem = { timestamp, level, message, detail };
    activityLogs.unshift(logItem);
    if (activityLogs.length > 200) activityLogs.pop();
    console.log(`[${timestamp}] [${level}] ${message}`);
}

module.exports = {
    activityLogs,
    logActivity
};
