/**
 * Constants.jsx
 * james.brunner@kaelus.com
 *
 * The CME action/event enumerations.
 */

var keyMirror = require('keymirror');

// these are actions and event types
module.exports = keyMirror({
	REQUEST: null,

	SESSION: null,
	DEVICE: null,

	ERROR: null,
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