/**
 * CmeActions.js
 * james.brunner@kaelus.com
 *
 * This class contains helper functions to wrap up requested
 * actions' payloads properly to send to the AppDispatcher.
 */

var AppDispatcher = require('../dispatcher/AppDispatcher');
var CmeConstants = require('../constants/CmeConstants');

var CmeActions = {

	login: function(u, p) {
		console.log('displatching login action...');
		AppDispatcher.dispatch({
			actionType: CmeConstants.LOGIN,
			u: u,
			p: p
		});
	},

	logout: function() {
		console.log('dispatching logout action...');
		AppDispatcher.dispatch({
			actionType: CmeConstants.LOGOUT
		});
	}


};

module.exports = CmeActions;