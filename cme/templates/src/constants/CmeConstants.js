/**
 * CmeConstants.js
 * james.brunner@kaelus.com
 *
 * The CME action enumerations.
 */

var keyMirror = require('keymirror');

// these are actions the CmeStore listens for and handles
module.exports = keyMirror({
	REQUEST: null,

	ERROR: null, // somebody said "errors!" - array of string
	CLEAR_ERRORS: null,

	INITIALIZE: null, // get the CME initial state in data
	LOGIN: null, // successful login to CME api
	LOGOUT: null // logout of CME api
});
