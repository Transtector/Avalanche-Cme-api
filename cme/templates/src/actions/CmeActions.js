/**
 * CmeActions.js
 * james.brunner@kaelus.com
 *
 * This class contains helper functions to wrap up requested
 * actions' payloads properly to send to the AppDispatcher.
 */
'use strict';

var AppDispatcher = require('../dispatcher/AppDispatcher');
var CmeConstants = require('../constants/CmeConstants');
var CmeAPI = require('../utils/CmeAPI');

function onErrors(errors) {
	AppDispatcher.dispatch({
		actionType: CmeConstants.ERROR,
		data: errors
	});
}

// alert that server request is going out
function dispatchRequest() {
	AppDispatcher.dispatch({ actionType: CmeConstants.REQUEST });
}

var CmeActions = {

	initialize: function(/* cme host */) {
		console.log('dispatching initialize action...');

		function onInitialized(initialData) {
			AppDispatcher.dispatch({
				actionType: CmeConstants.INITIALIZE,
				data: initialData
			});
		}
		dispatchRequest();
		return CmeAPI.initialize(onInitialized, onErrors);
	},

	clearErrors: function() {
		AppDispatcher.dispatch({ actionType: CmeConstants.CLEAR_ERRORS });
	},

	login: function(u, p) {
		console.log('dispatching login action...');

		function onLoggedIn() {
			AppDispatcher.dispatch({ actionType: CmeConstants.LOGIN });
		}

		dispatchRequest();
		CmeAPI.login({ u: u, p: p }, onLoggedIn, onErrors);
	},

	logout: function() {
		console.log('dispatching logout action...');
		CmeAPI.logout(); // don't wait - just dispatch logout
		AppDispatcher.dispatch({ actionType: CmeConstants.LOGOUT });
	}
};

module.exports = CmeActions;