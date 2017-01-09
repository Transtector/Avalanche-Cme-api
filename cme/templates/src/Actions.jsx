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

/* track error state */
var ERROR = false;

/* jQuery AJAX errors return using this function
   signature.  Note that the jqXHR oject properties
   can override the textStatus and errorThrown arguments. */
function onError(jqXHR, textStatus, errorThrown) {

	ERROR = true;

	var code = jqXHR.status;
	var source = jqXHR.responseText || errorThrown;

	if (!jqXHR || code === 0 || source === '') {
		source = 'Device disconnected or not running.'
	} 

	AppDispatcher.dispatch({
		actionType: Constants.ERROR,
		data: { code: code, source: source }
	});
}

// alert that server request is going out
function dispatchRequest(action, silent) {
	if (ERROR) {
		debug("Error prevented server request: " + action);
		return false;
	}
	if (!silent)
		debug("Server request: " + action);
	
	// kind of hacky for now, but enforces serialized dispatching...
	setTimeout(function () {
		AppDispatcher.dispatch({ actionType: Constants.REQUEST });
	}, 0);

	return true;
}

var Actions = {
	setDebug: function(d) {
		DEBUG = d;
	},

	clearErrors: function() {
		ERROR = false;
		AppDispatcher.dispatch({ actionType: Constants.CLEAR_ERRORS });
	},

	/* used for error troubleshooting or injecting an error
	   from the client */ 
	injectError: function(err) {

		onError({ status: 600 }, 'error', err);
	},

	device: function() {
		if (!dispatchRequest('device')) return;

		return CmeAPI.device()
			.done(function(data) {
				// we got something back - check to see if it's
				// the CME device data else call error.
				if (!data.device) {

					onError({ status: 500 }, 'error', 'Cme device not found.');
				
				} else {

					AppDispatcher.dispatch({ actionType: Constants.DEVICE, data: data.device });

				}
			})
			.fail(onError);
	},

	config: function(obj) {
		// obj is _cme['config'] or an object on _cme['config']
		var key = Object.keys(obj)[0];
		var ready;

		if (obj) {
			ready = dispatchRequest('writing {' + key + ': ' + obj[key] + '}');
		} else {
			ready = dispatchRequest('reading ' + key);
		}

		if (!ready) return;

		return CmeAPI.config(obj)
			.done(function(data) {
				AppDispatcher.dispatch({ actionType: Constants.CONFIG, data: data });
			})
			.fail(onError);
	},

	reset: function(reset_network, reset_clock) {
		if (!dispatchRequest("factory reset")) return;

		CmeAPI.reset(reset_network, reset_clock)
			.fail(onError)
			.always(Actions.logout);
	},

	restart: function() {
		if (!dispatchRequest('restarting device')) return;

		CmeAPI.restart()
			.fail(onError)
			.always(Actions.logout);
	},

	/*	Login can be called a couple of different ways.  If called with no arguments,
		then we simply try to request the CME config object.  On success, the SESSION
		and CONFIG states are set (dispatched).  On failure, we do nothing as our intial
		state assumes invalid session (i.e., not yet logged in).
	
		Login can also be used in the "traditional" mode, where a username and password
		are passed to the CmeAPI.  In this case, the successful return dispatches to
		update the SESSION state and a new CmeAPI call is performed to retrieve the CME
		configuration.  On success of that call, the CONFIG state is updated.  In this
		mode, errors are reported as normal (i.e., through the onError callback).	*/
	login: function(u, p) {

		if (arguments.length == 0) {

			if (!dispatchRequest('config')) return;

			return CmeAPI.config()
				.done(function(data) {
					if (data.config) {
						AppDispatcher.dispatch({ actionType: Constants.SESSION, data: true });
						AppDispatcher.dispatch({ actionType: Constants.CONFIG, data: data });
					}
				});

		} else {

			if (!dispatchRequest('login')) return;

			return CmeAPI.login(u, p)
				.done(function(data) {
					dispatchRequest('config');
					CmeAPI.config(null)
						.done(function(data) {
							AppDispatcher.dispatch({ actionType: Constants.SESSION, data: true });
							AppDispatcher.dispatch({ actionType: Constants.CONFIG, data: data });
						})
						.fail(onError);
				})
				.fail(onError);
		}
	},

	logout: function() {
		CmeAPI.logout()
			.always(function () {
				AppDispatcher.dispatch({ actionType: Constants.SESSION, data: false });
			});
	},

	profile: function(u, p, success) {
		if (!dispatchRequest("user profile")) return;

		// Note here the application state will not change -
		// so no need to dispatch an update to the Store.
		CmeAPI.user(u, p)
			.done(success)
			.fail(onError);
	},

	// Read available software updates
	getUpdates: function() {
		if (!dispatchRequest('reading update status')) return;

		CmeAPI.getUpdates()
			.done(function(data) {
				AppDispatcher.dispatch({ actionType: Constants.UPDATES, data: data });
			})
			.fail(onError);
	},

	// Removes a pending update (so it won't be used at next restart)
	deleteUpdate: function() {
		if (!dispatchRequest('deleting pending update')) return;

		CmeAPI.deleteUpdate()
			.done(function(data) {
				AppDispatcher.dispatch({ actionType: Constants.UPDATES, data: data });
			})
			.fail(onError);
	},

	// Upload an update to make it available for install
	uploadUpdate: function(formData, onProgress, onComplete) {
		if (!dispatchRequest('uploading update')) return;

		CmeAPI.uploadUpdate(formData, onProgress, onComplete)
			.done(function(data) { 
				AppDispatcher.dispatch({ actionType: Constants.UPDATES, data: data });
				onComplete();
			})
			.fail(onError);
	},

	// Move an update to pending (so it will be used at next restart)
	installUpdate: function(installSource, installName) {
		if (!dispatchRequest('installing update')) return;

		CmeAPI.installUpdate(installSource, installName)
			.done(function(data) { 
				AppDispatcher.dispatch({ actionType: Constants.UPDATES, data: data });
			})
			.fail(onError);
	},

	ui: function(panel) {
		var panel;

		AppDispatcher.dispatch({ actionType: Constants.UI_PANEL, data: panel });
	},

	clock: function() {
		if (!dispatchRequest('reading clock', true)) return;

		CmeAPI.clock()
			.done(function(data) {
				AppDispatcher.dispatch({ actionType: Constants.CLOCK, data: data });
			})
			.fail(onError);
	},

	temperature: function() {
		if (!dispatchRequest('reading temperature', true)) return;

		CmeAPI.temperature()
			.done(function(data) {
				AppDispatcher.dispatch({ actionType: Constants.TEMPERATURE, data: data });
			})
			.fail(onError);
	},

	logs: function(filename, download, clear) {
		if (!dispatchRequest('reading logs')) return;
		
		// if no filename, just read the current logs list
		if (!filename) {
			CmeAPI.logs()
				.done(function(data) {
					AppDispatcher.dispatch({ actionType: Constants.LOGS, data: data });
				})
				.fail(onError);

		} else {

			var request = {};
			request.name = filename;
			request.download = !!download;
			request.clear = !!clear;

			CmeAPI.logs(request);
		}
	},

	channels: function() {
		if (!dispatchRequest('reading channels')) return;

		CmeAPI.channels()
			.done(function(data) {
				AppDispatcher.dispatch({ actionType: Constants.CHANNELS, data: data });
			})
			.fail(onError);
	},

	channel: function(ch_id, ch_config, ch_history) {
		if (!dispatchRequest('reading ' + ch_id + ' (' + JSON.stringify(ch_config) + ', ' + ch_history + ')')) return;

		CmeAPI.channel(ch_id, ch_config, ch_history)
			.done(function(data) {
				AppDispatcher.dispatch({ actionType: Constants.CHANNEL, data: data });
			})
			.fail(onError);
	},

	deleteChannel: function(ch_id) {
		if (!dispatchRequest('clearing ' + ch_id + ' history')) return;

		CmeAPI.deleteChannel(ch_id)
			.done(function(data) {
				AppDispatcher.dispatch({ actionType: Constants.CHANNEL, data: data });
			})
			.fail(onError);
	},

	exportChannel: function(ch_id, ch_history) {

		// open a new window (tab) to the CME export page
		// and add ch_id and ch_history to the query string
		var url = 'export.html?c=' + encodeURIComponent(ch_id) + '&h=' + encodeURIComponent(ch_history);
		window.open(url, '_blank');
	},

	thresholds: function(ch_id, sensor_id, thresholds) {
		if (!dispatchRequest('posting thresholds for ' + ch_id + ':' + sensor_id)) return;

		console.log("You're trying to update these thresholds:\n", thresholds);

		// when CmeAPI thresholds calls finishes, it returns the entire channel in data
		CmeAPI.thresholds(ch_id, sensor_id, thresholds)
			.done(function(data) {
				AppDispatcher.dispatch({ actionType: Constants.CHANNEL, data: data });
			})
			.fail(onError);
	}
};

window.Actions = Actions;
module.exports = Actions;