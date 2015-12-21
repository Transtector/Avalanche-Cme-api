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

	channelControl: function(chId, controlId, state) {
		dispatchRequest(chId + ':' + controlId + ' = ' + state);
		CmeAPI.channelControl(chId, controlId, state, function(data) {
			AppDispatcher.dispatch({ actionType: Constants.CHANNEL_CONTROL, data: data });
		}, onErrors);
	}
};
window.INTERVALS = INTERVALS;
module.exports = Actions;