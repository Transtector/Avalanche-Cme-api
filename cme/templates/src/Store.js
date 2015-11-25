/*
 * Store.js
 * james.brunner@kaelus.com
 *
 * Repository for the Cme application model.
*/
'use strict';

var AppDispatcher = require('./AppDispatcher');
var Constants = require('./Constants');
var EventEmitter = require('events').EventEmitter;

var assign = require('object-assign'); // ES6 polyfill

var CHANGE_EVENT = 'change';

var _cme = {};
var _errors = [];
var _isLoggedIn = false;
var _isSubmitting = false;

var Store = assign({}, EventEmitter.prototype, {

	getState: function() {
		return {
			cme: _cme,
			errors: _errors,
			isLoggedIn: _isLoggedIn,
			isSubmitting: _isSubmitting
		}
	},

	emitChange: function() {
		this.emit(CHANGE_EVENT);
	},

	addChangeListener: function(callback) {
		this.on(CHANGE_EVENT, callback);
	},

	removeChangeListener: function(callback) {
		this.removeListener(CHANGE_EVENT, callback);
	},

	dispatcherIndex: AppDispatcher.register(function(action) {

		switch(action.actionType) {

			case Constants.REQUEST:
				console.log('submitting a request...');
				_isSubmitting = true;
				break;

			case Constants.SESSION:
				console.log('handling dispatched session action, data = ', action.data);
				_isLoggedIn = action.data;
				break;

			case Constants.DEVICE:
				console.log('handling dispatched device action, data = ', action.data);
				_cme['device'] = action.data;
				break;

			case Constants.ERROR:
				console.log('handling dispatched error action: ', action.data);
				_errors = Array.isArray(action.data) ? action.data : [action.data];
				break;

			case Constants.CLEAR_ERRORS:
				console.log('handling clear errors');
				_errors = [];
				break;

			case Constants.LOGIN:
				console.log('handling dispatched login action');
				_isLoggedIn = true;
				break;

			case Constants.LOGOUT:
				console.log('handling dispatched logout action');
				_isLoggedIn = false;
				break;

			default: // not an action we're looking for - ignore
				return true;
		}

		// explicitely check here for REQUEST action
		// to reset the _isSubmitting bool
		if (action.actionType !== Constants.REQUEST)
			_isSubmitting = false;

		Store.emitChange(); // notify store changes

		return true; // No errors. Needed by promise in Dispatcher.
	})
});

module.exports = Store;
