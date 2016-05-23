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

function onError(jqXHR, status, error) {

	var code = jqXHR.status;
	var source = jqXHR.responseJSON
		? jqXHR.responseJSON.join(',\n') + ' [' + code + ']'
		: jqXHR.responseText + ' [' + code + ']';

	AppDispatcher.dispatch({
		actionType: Constants.ERROR,
		data: { code: code, source: source }
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

	clearErrors: function() {

		AppDispatcher.dispatch({ actionType: Constants.CLEAR_ERRORS });
	},

	injectError: function(err) {
		
		onError({ status: 600, responseText: err });
	},

	device: function() {
		dispatchRequest('device');

		return CmeAPI.device()
			.done(function(data) {
				// we got something back - check to see if it's
				// the CME device data else call error.
				if (!data.device) {

					onError(500, 'Cme device not found.');
				
				} else {

					AppDispatcher.dispatch({ actionType: Constants.DEVICE, data: data.device });

				}
			})
			.fail(onError);
	},

	config: function(obj) {
		// obj is _cme['config'] or an object on _cme['config']
		dispatchRequest('reading config');

		return CmeAPI.config(obj)
			.done(function(data) {
				AppDispatcher.dispatch({ actionType: Constants.CONFIG, data: data });
			})
			.fail(onError);
	},

	reset: function(reset_network, reset_clock) {
		dispatchRequest("factory reset");

		CmeAPI.reset(reset_network, reset_clock)
			.fail(onError)
			.always(Actions.logout);
	},

	restart: function() {
		dispatchRequest('restarting device');

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

			dispatchRequest('config');

			return CmeAPI.config()
				.done(function(data) {
					if (data.config) {
						AppDispatcher.dispatch({ actionType: Constants.SESSION, data: true });
						AppDispatcher.dispatch({ actionType: Constants.CONFIG, data: data });
					}
				});

		} else {

			dispatchRequest('login');

			return CmeAPI.login(u, p)
				.done(function(data) {
					AppDispatcher.dispatch({ actionType: Constants.SESSION, data: true });

					dispatchRequest('config');
					CmeAPI.config(null)
						.done(function(data) {
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
		dispatchRequest("user profile");

		// Note here the application state will not change -
		// so no need to dispatch an update to the Store.
		CmeAPI.user(u, p)
			.done(success)
			.fail(onError);
	},

	/*	Updates uses the 'action' string parameter to
		determine how the underlying API gets called.
	
		Supported actions are:
	 		null (w/null 2nd parameter) - just read current update status
	 		'delete' - removes any pending updates, NOP if no pending updates
			'upload' - uploads a file described by the formData object and has optional progress handler function
			'install' - moves an available update into pending update status
				(which means the update can get used on next Cme restart). */

	// Read available software updates
	getUpdates: function() {
		dispatchRequest('reading update status');

		CmeAPI.getUpdates()
			.done(function(data) {
				AppDispatcher.dispatch({ actionType: Constants.UPDATES, data: data });
			})
			.fail(onError);
	},

	// Removes a pending update (so it won't be used at next restart)
	deleteUpdate: function() {
		dispatchRequest('deleting pending update');

		CmeAPI.deleteUpdate()
			.done(function(data) {
				AppDispatcher.dispatch({ actionType: Constants.UPDATES, data: data });
			})
			.fail(onError);
	},

	uploadUpdate: function(formData, onProgress, onComplete) {
		dispatchRequest('uploading update');

		CmeAPI.uploadUpdate(formData, onProgress, onComplete)
			.done(function(data) { 
				AppDispatcher.dispatch({ actionType: Constants.UPDATES, data: data });
				onComplete();
			})
			.fail(onError);
	},

	installUpdate: function(installSource, installName) {
		dispatchRequest('installing update');

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
		dispatchRequest('reading clock');

		CmeAPI.clock()
			.done(function(data) {
				AppDispatcher.dispatch({ actionType: Constants.CLOCK, data: data });
			})
			.fail(onError);
	},

	temperature: function() {
		dispatchRequest('reading temperature');

		CmeAPI.temperature()
			.done(function(data) {
				AppDispatcher.dispatch({ actionType: Constants.TEMPERATURE, data: data });
			})
			.fail(onError);
	},

	logs: function(filename, download, clear) {

		// if no filename, just read the current logs list
		if (!filename) {
			dispatchRequest('reading logs');

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
		dispatchRequest('reading channels');

		CmeAPI.channels()
			.done(function(data) {
				AppDispatcher.dispatch({ actionType: Constants.CHANNELS, data: data });
			})
			.fail(onError);
	},

	channel: function(chId, ch_pub, ch_config) {
		dispatchRequest(chId + ' ' + JSON.stringify(ch_pub));

		CmeAPI.channel(chId, ch_pub, ch_config)
			.done(function(data) {
				AppDispatcher.dispatch({ actionType: Constants.CHANNEL, data: data });
			})
			.fail(onError);
	},

	control: function(chId, controlId, control) {
		dispatchRequest(chId + ':' + controlId + ': ' + JSON.stringify(control));

		CmeAPI.control(chId, controlId, control)
			.done(function(data) {
				AppDispatcher.dispatch({ actionType: Constants.CONTROL, data: data });
			})
			.fail(onError);
	}
};

module.exports = Actions;