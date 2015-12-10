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

var INTERVALS = {}; // polling interval refs

function onErrors(errors) {
	for (var intervalType in INTERVALS) {
		clearInterval(INTERVALS[intervalType].r);
	}

	AppDispatcher.dispatch({
		actionType: Constants.ERROR,
		data: errors
	});
}

// alert that server request is going out
function dispatchRequest(action) {
	debug("Server request: " + action);
	AppDispatcher.dispatch({ actionType: Constants.REQUEST });
}

var Actions = {

	session: function () {
		dispatchRequest('session');
		return CmeAPI.session(function(validSession) {
			AppDispatcher.dispatch({
				actionType: Constants.SESSION,
				data: validSession
			});
		});
	},

	device: function() {
		dispatchRequest('device');
		return CmeAPI.device(function(deviceData) {
			AppDispatcher.dispatch({
				actionType: Constants.DEVICE,
				data: deviceData
			});
		}, onErrors);
	},

	clearErrors: function() {
		// restart polling when errors cleared
		for (var intervalType in INTERVALS) {
			var I = INTERVALS[intervalType];
			I.r = setInterval(I.f, I.i);
		}
		AppDispatcher.dispatch({ actionType: Constants.CLEAR_ERRORS });
	},

	injectError: function(err) {
		onErrors([ err ]);
	},

	login: function(u, p) {
		dispatchRequest('login');
		CmeAPI.login({ u: u, p: p }, function() {
			AppDispatcher.dispatch({ actionType: Constants.LOGIN });
		}, onErrors);
	},

	logout: function() {
		CmeAPI.logout('logout'); // don't wait - just dispatch logout
		AppDispatcher.dispatch({ actionType: Constants.LOGOUT });
	},

	home: function() {
		AppDispatcher.dispatch({ actionType: Constants.HOME });
	},

	poll: function(type, action, interval) {
		var interval = interval || 1000;

		function pollClock() {
			dispatchRequest('polling clock');
			CmeAPI.poll('config/clock', function(data) {
				AppDispatcher.dispatch({ actionType: Constants.CLOCK, data: data });
			}, onErrors);
		}

		function pollStatus() {
			dispatchRequest('polling status');
			CmeAPI.poll('', function(data) {
				AppDispatcher.dispatch({ actionType: Constants.STATUS, data: data });
			}, onErrors);
		}

		var pollFunction;
		switch(type) {
			case Constants.CLOCK:
				pollFunction = pollClock;
				break;

			case Constants.STATUS:
				pollFunction = pollStatus;
				break;

			default:
				return;
		}

		switch(action) {
			case Constants.START:
				if (!INTERVALS[type])
					INTERVALS[type] = {
						r: setInterval(pollFunction, interval),
						f: pollFunction,
						i: interval
					};
				break;

			case Constants.STOP:
				if (INTERVALS[type]) {
					clearInterval(INTERVALS[type].r);
					delete INTERVALS[type];
				}
				break;

			default:
				return;
		}
	},

	config: function(obj) {
		// obj is _cme['config'] or an object on _cme['config']
		dispatchRequest('config');
		CmeAPI.config(obj, function(data) {
			AppDispatcher.dispatch({ actionType: Constants.CONFIG, data: data });
		}, onErrors);
	}
};

module.exports = Actions;