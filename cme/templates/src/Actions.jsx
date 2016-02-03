/**
 * Actions.jsx
 * james.brunner@kaelus.com
 *
 * This class contains helper functions to wrap up requested
 * actions' payloads properly to send to the AppDispatcher.
 */
'use strict';

var DEBUG = true;
function debug(/* arguments */) {
	if (!DEBUG) return;
	console.log.apply(console, arguments);
}

var AppDispatcher = require('./AppDispatcher');
var Constants = require('./Constants');
var CmeAPI = require('./CmeAPI');

function onErrors(errors) {

	AppDispatcher.dispatch({
		actionType: Constants.ERROR,
		data: Array.isArray(errors) ? errors : [ errors ]
	});
}

// alert that server request is going out
function dispatchRequest(action) {
	debug("Server request: " + action);
	
	// kind of hacky for now, but enforces serialized dispatching...
	setTimeout(function () {
		AppDispatcher.dispatch({ actionType: Constants.REQUEST });
	}, 0);
}

var Actions = {

	device: function() {
		dispatchRequest('reading device');
		return CmeAPI.device(function(data) {
			AppDispatcher.dispatch({ actionType: Constants.DEVICE, data: data });
		}, onErrors);
	},

	clearErrors: function() {

		AppDispatcher.dispatch({ actionType: Constants.CLEAR_ERRORS });
	},

	injectError: function(err) {
		
		onErrors([ err ]);
	},

	// Login can be called a couple of different ways.  If called with no arguments,
	// then we simply try to request the CME config object.  On success, the SESSION
	// and CONFIG states are set (dispatched).  On failure, we do nothing as our intial
	// state assumes invalid session (i.e., not yet logged in).
	//
	// Login can also be used in the "traditional" mode, where a username and password
	// are passed to the CmeAPI.  In this case, the successful return dispatches to
	// update the SESSION state and a new CmeAPI call is performed to retrieve the CME
	// configuration.  On success of that call, the CONFIG state is updated.  In this
	// mode, errors are reported as normal (i.e., through the onErrors callback).
	login: function(u, p) {
		dispatchRequest('login');

		if (arguments.length == 0) {

			return CmeAPI.config(null, function(data) {
				if (data.config) {
					AppDispatcher.dispatch({ actionType: Constants.SESSION, data: true });
					AppDispatcher.dispatch({ actionType: Constants.CONFIG, data: data });
				}
			}, function () { /* NOP */ });
		
		} else {

			return CmeAPI.login({ u: u, p: p }, function(data) {
				AppDispatcher.dispatch({ actionType: Constants.SESSION, data: data });
				CmeAPI.config(null, function(data) {
					AppDispatcher.dispatch({ actionType: Constants.CONFIG, data: data });
				}, onErrors);
			}, onErrors);
		}
	},

	logout: function() {
		CmeAPI.logout(); // don't wait - just dispatch logout
		AppDispatcher.dispatch({ actionType: Constants.SESSION, data: false });
	},

	factoryReset: function() {
		dispatchRequest("factory reset");
		CmeAPI.factoryReset(Actions.logout, onErrors);
	},

	profile: function(u, p, success) {
		dispatchRequest("user profile");

		// Note here the application state will not change -
		// so no need to dispatch an update to the Store.
		CmeAPI.user(u, p, success, onErrors);
	},

	showHome: function() {

		AppDispatcher.dispatch({ actionType: Constants.SHOW_HOME });
	},

	showConfig: function() {

		AppDispatcher.dispatch({ actionType: Constants.SHOW_CONFIG });
	},

	config: function(obj) {
		// obj is _cme['config'] or an object on _cme['config']
		dispatchRequest('reading config');
		return CmeAPI.config(obj, function(data) {
			AppDispatcher.dispatch({ actionType: Constants.CONFIG, data: data });
		}, onErrors);
	},

	clock: function() {
		dispatchRequest('reading clock');
		CmeAPI.clock(function(data) {
			AppDispatcher.dispatch({ actionType: Constants.CLOCK, data: data });
		}, onErrors);
	},

	temperature: function() {
		dispatchRequest('reading temperature');
		CmeAPI.temperature(function(data) {
			AppDispatcher.dispatch({ actionType: Constants.TEMPERATURE, data: data });
		}, onErrors);
	},

	channels: function(expand_channels) {
		dispatchRequest('reading channels');
		CmeAPI.channels(expand_channels, function(data) {
			AppDispatcher.dispatch({ actionType: Constants.CHANNELS, data: data });
		}, onErrors);
	},

	channel: function(chId, expand, obj) {
		dispatchRequest(chId);
		CmeAPI.channel(chId, expand, obj, function(data) {
			AppDispatcher.dispatch({ actionType: Constants.CHANNEL, data: data });
		}, onErrors);
	},

	control: function(chId, controlId, control) {
		dispatchRequest(chId + ':' + controlId + ': ' + JSON.stringify(control));
		CmeAPI.control(chId, controlId, control, function(data) {
			AppDispatcher.dispatch({ actionType: Constants.CONTROL, data: data });
		}, onErrors);
	}
};

module.exports = Actions;