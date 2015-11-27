/**
 * Actions.js
 * james.brunner@kaelus.com
 *
 * This class contains helper functions to wrap up requested
 * actions' payloads properly to send to the AppDispatcher.
 */
'use strict';

var AppDispatcher = require('./AppDispatcher');
var Constants = require('./Constants');
var CmeAPI = require('./CmeAPI');

function onErrors(errors) {
	AppDispatcher.dispatch({
		actionType: Constants.ERROR,
		data: errors
	});
}

// alert that server request is going out
function dispatchRequest() {
	AppDispatcher.dispatch({ actionType: Constants.REQUEST });
}

var Actions = {

	session: function () {
		console.log('dispatching session action...');
		dispatchRequest();
		return CmeAPI.session(function(validSession) {
			AppDispatcher.dispatch({
				actionType: Constants.SESSION,
				data: validSession
			});
		});
	},

	device: function() {
		console.log('dispatching device action...');
		dispatchRequest();
		return CmeAPI.device(function(deviceData) {
			AppDispatcher.dispatch({
				actionType: Constants.DEVICE,
				data: deviceData
			});
		}, onErrors);
	},

	clearErrors: function() {
		AppDispatcher.dispatch({ actionType: Constants.CLEAR_ERRORS });
	},

	login: function(u, p) {
		console.log('dispatching login action...');

		function onLoggedIn() {
			AppDispatcher.dispatch({ actionType: Constants.LOGIN });
		}

		dispatchRequest();
		CmeAPI.login({ u: u, p: p }, onLoggedIn, onErrors);
	},

	logout: function() {
		console.log('dispatching logout action...');
		CmeAPI.logout(); // don't wait - just dispatch logout
		AppDispatcher.dispatch({ actionType: Constants.LOGOUT });
	},

	home: function() {
		AppDispatcher.dispatch({ actionType: Constants.HOME });
	},

	config: function() {
		dispatchRequest();
		CmeAPI.config(function(configData) {
			AppDispatcher.dispatch({ actionType: Constants.CONFIG, data: configData });
		}, onErrors);
	}
};

module.exports = Actions;