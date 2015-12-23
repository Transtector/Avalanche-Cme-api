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

	ERROR: null, // somebody said "errors!" - array of string
	CLEAR_ERRORS: null,

	// polling commands
	START: null,
	STOP: null,
	PAUSE: null,
	UNPAUSE: null,

	CLOCK: null,
	STATUS: null,
	CHANNEL: null,
	CONTROL: null,

	SHOW_HOME: null,
	SHOW_CONFIG: null,
	CONFIG: null
});
