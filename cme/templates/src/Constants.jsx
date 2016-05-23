/**
 * Constants.jsx
 * james.brunner@kaelus.com
 *
 * The CME action enumerations.
 */

var keyMirror = require('keymirror');

// these are actions the CmeStore listens for and handles
module.exports = keyMirror({
	REQUEST: null,

	SESSION: null,
	DEVICE: null,

	ERROR: null, // somebody said "errors!" - [ <string> ]
	CLEAR_ERRORS: null,

	CONFIG: null,
	CLOCK: null,
	TEMPERATURE: null,
	LOGS: null,
	UPDATES: null,

	CHANNELS: null,
	CHANNEL: null,
	CONTROL: null,

	UI_PANEL: null,
});

// Change Types for PollingStore event registration
module.exports.ChangeTypes = keyMirror({
	CHANGE: null,
	CLOCK: null,
	TEMPERATURE: null,
	LOGS: null,
	UPDATES: null,
	CHANNELS: null,
	CHANNEL: null,
	CONTROL: null
});
