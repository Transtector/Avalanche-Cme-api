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

var INTERVALS = {};

function pausePolling(name) {
	var name = name || true;

	if (INTERVALS.paused)
		return;

	for (var i in INTERVALS) {
		clearInterval(INTERVALS[i].r);
		INTERVALS[i].r = null;
	}
	INTERVALS.paused = name;
}

function unpausePolling(name) {
	var name = name || true;

	if (INTERVALS.paused && INTERVALS.paused === name) {

		delete INTERVALS.paused;
		for (var i in INTERVALS) {
			INTERVALS[i].r = setInterval(INTERVALS[i].f, INTERVALS[i].i);
		}
	}
}

function readClock() {
	dispatchRequest('reading clock');
	CmeAPI.poll('config/clock', function(data) {
		AppDispatcher.dispatch({ actionType: Constants.CLOCK, data: data });
	}, onErrors);
}

function readStatus() {
	dispatchRequest('reading status');
	CmeAPI.poll('', function(data) {
		AppDispatcher.dispatch({ actionType: Constants.STATUS, data: data });
	}, onErrors);
}

function onErrors(errors) {
	pausePolling('errors');

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

	device: function() {
		dispatchRequest('device');
		return CmeAPI.device(function(data) {
			AppDispatcher.dispatch({ actionType: Constants.DEVICE, data: data });
		}, onErrors);
	},

	clearErrors: function() {
		// restart polling when errors cleared
		unpausePolling('errors');
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
		CmeAPI.logout('logout'); // don't wait - just dispatch logout
		AppDispatcher.dispatch({ actionType: Constants.SESSION, data: false });
	},

	showHome: function() {

		AppDispatcher.dispatch({ actionType: Constants.SHOW_HOME });
	},

	showConfig: function() {

		AppDispatcher.dispatch({ actionType: Constants.SHOW_CONFIG });
	},

	poll: function(pollCommand, pollFunctionType, interval) {
		var interval = interval || 1000;

		var pollFunction;
		switch(pollFunctionType) {
			case Constants.CLOCK:
				pollFunction = readClock;
				break;

			case Constants.STATUS:
				pollFunction = readStatus;
				break;
		}

		switch(pollCommand) {
			case Constants.START:
				if (!pollFunctionType || INTERVALS.paused)
					return;

				if (!INTERVALS[pollFunctionType])
					INTERVALS[pollFunctionType] = {
						r: setInterval(pollFunction, interval),
						f: pollFunction,
						i: interval
					};
				break;

			case Constants.PAUSE:
				pausePolling();
				break;

			case Constants.UNPAUSE:
				unpausePolling();
				break;

			case Constants.STOP:
				if (!pollFunctionType) {
					for (var intervalType in INTERVALS) {
						clearInterval(INTERVALS[intervalType].r);
					}
					INTERVALS = {};
				} else if (INTERVALS[pollFunctionType]) {
					clearInterval(INTERVALS[pollFunctionType].r);
					delete INTERVALS[pollFunctionType];
				}
				break;
		}
	},

	config: function(obj) {
		// obj is _cme['config'] or an object on _cme['config']
		dispatchRequest('config');
		return CmeAPI.config(obj, function(data) {
			AppDispatcher.dispatch({ actionType: Constants.CONFIG, data: data });
		}, onErrors);
	},

	channel: function(chId, obj) {
		dispatchRequest(chId);
		CmeAPI.channel(chId, obj, function(data) {
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