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
		dispatchRequest('device');
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

	/*	Login can be called a couple of different ways.  If called with no arguments,
		then we simply try to request the CME config object.  On success, the SESSION
		and CONFIG states are set (dispatched).  On failure, we do nothing as our intial
		state assumes invalid session (i.e., not yet logged in).
	
		Login can also be used in the "traditional" mode, where a username and password
		are passed to the CmeAPI.  In this case, the successful return dispatches to
		update the SESSION state and a new CmeAPI call is performed to retrieve the CME
		configuration.  On success of that call, the CONFIG state is updated.  In this
		mode, errors are reported as normal (i.e., through the onErrors callback).	*/
	login: function(u, p) {

		if (arguments.length == 0) {

			dispatchRequest('config');

			return CmeAPI.config(null, function(data) {
				if (data.config) {
					AppDispatcher.dispatch({ actionType: Constants.SESSION, data: true });
					AppDispatcher.dispatch({ actionType: Constants.CONFIG, data: data });
				}
			}, function () { /* NOP */ });
		
		} else {

			dispatchRequest('login');

			return CmeAPI.login({ u: u, p: p }, function(data) {
				AppDispatcher.dispatch({ actionType: Constants.SESSION, data: true });

				dispatchRequest('config');
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

	reset: function() {
		dispatchRequest("reset");
		CmeAPI.reset(Actions.logout, onErrors);
	},

	restart: function() {
		dispatchRequest('restarting device');
		CmeAPI.restart(Actions.logout, onErrors);
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

	logs: function(filename, download, clear) {
		if (!filename) {
			dispatchRequest('reading logs');
			CmeAPI.logs(null, function(data) {
				AppDispatcher.dispatch({ actionType: Constants.LOGS, data: data });
			}, onErrors);
		} else {
			var request = {};
			request.name = filename;
			request.download = !!download;
			request.clear = !!clear;

			CmeAPI.logs(request);
		}
	},

	/*	Updates uses the 'action' string parameter to
		determine how the underlying API gets called.
	
		Supported actions are:
	 		null (w/null 2nd parameter) - just read current update status
	 		'delete' - removes any pending updates, NOP if no pending updates
			'upload' - uploads a file described by the formData object and has optional progress handler function
			'install' - moves an available update into pending update status
				(which means the update can get used on next Cme restart). */
	updates: function(action, formDataOrInstallSource, progressHandlerOrInstallName, completeHandler) {

		switch (action.toLowerCase()) {
			case 'delete':
				dispatchRequest('deleting pending update');
				CmeAPI.deleteUpdate(function(data) {
					AppDispatcher.dispatch({ actionType: Constants.UPDATES, data: data });
				}, onErrors);
				break;

			case 'upload':
				dispatchRequest('uploading update');
				CmeAPI.uploadUpdate(formDataOrInstallSource, progressHandlerOrInstallName, function(data) { 
					AppDispatcher.dispatch({ actionType: Constants.UPDATES, data: data });
					completeHandler();
				}, onErrors);
				break;

			case 'install':
				dispatchRequest('installing update');
				CmeAPI.installUpdate(formDataOrInstallSource, progressHandlerOrInstallName, function(data) { 
					AppDispatcher.dispatch({ actionType: Constants.UPDATES, data: data });
				}, onErrors);
				break;

			default:
				dispatchRequest('reading update status');
				CmeAPI.getUpdates(function(data) {
					AppDispatcher.dispatch({ actionType: Constants.UPDATES, data: data });
				}, onErrors);
		}
	},

	channels: function() {
		dispatchRequest('reading channels');
		CmeAPI.channels(function(data) {
			AppDispatcher.dispatch({ actionType: Constants.CHANNELS, data: data });
		}, onErrors);
	},

	channel: function(chId, ch_pub, ch_config) {
		dispatchRequest(chId + ' ' + JSON.stringify(ch_pub));
		CmeAPI.channel(chId, ch_pub, ch_config, function(data) {
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