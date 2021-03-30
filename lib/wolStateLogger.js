const DEFAULT_MAX_LENGTH = 65536;

const fs = require("fs");

class WOLStateLogger {
  constructor(options = { maxLength: undefined }) {
    if (options.maxLength && typeof options.maxLength == "number") {
      this._maxLength = options.maxLength;
    } else {
      this._maxLength = DEFAULT_MAX_LENGTH;
    }

    this._log = [];
    this._nextPollCallbacks = [];
  }

  _add(logEntry) {
    while (this._log.length >= this._maxLength) {
      this._log.shift();
    }
    this._log.push(logEntry);
    console.log("New log entry:");
    console.log(JSON.stringify(logEntry, null, 2));
  }

  wakeup(metaData, onNextPoll) {
    this._add(_makeLogEntry("wakeup", metaData));
    if (onNextPoll && typeof onNextPoll == "function") {
      this._nextPollCallbacks.push(onNextPoll);
    }
  }

  poll(metaData) {
    // Check if latest log entry was a wakeup call
    const res = this.getLatest() && this.getLatest().type == "wakeup";

    // Add poll call to log
    this._add(_makeLogEntry("poll", metaData));

    // Execute next poll callbacks (if any)
    this._nextPollCallbacks.forEach((fun) => {
      fun();
    });

    // Reset next poll callbacks array
    this._nextPollCallbacks = [];

    return res;
  }

  getLog(maxEvents) {
    if (typeof maxEvents == "number") {
      return this._log.slice(Math.max(this._log.length - maxEvents, 0));
    } else {
      return this._log.slice();
    }
  }

  getLatest() {
    return this._log[this._log.length - 1];
  }
}

function _makeLogEntry(type, metaData) {
  // Get rid of nasty stuff (e.g., functions)
  metaData = JSON.parse(JSON.stringify(metaData));
  let logEntry = { timestamp: new Date().toISOString(), type };
  Object.assign(logEntry, metaData);
  return logEntry;
}

module.exports = WOLStateLogger;
