/*
 * CmeStore.js
 * james.brunner@kaelus.com
 *
 * Repository for the Cme application model.
*/
'use strict';

var AppDispatcher = require('../dispatcher/AppDispatcher');
var CmeConstants = require('../constants/CmeConstants');
var EventEmitter = require('events').EventEmitter;

var assign = require('object-assign'); // ES6 polyfill

var CHANGE_EVENT = 'change';

var _cme = {};
var _errors = [];
var _isLoggedIn = false;
var _isSubmitting = false;

var CmeStore = assign({}, EventEmitter.prototype, {

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

			case CmeConstants.REQUEST:
				_isSubmitting = true;
				break;

			case CmeConstants.ERROR:
				console.log('handling dispatched error action: \n', action.data);
				action.data.forEach(function (msg) { _errors.push(msg); });
				break;

			case CmeConstants.CLEAR_ERRORS:
				console.log('handling clear errors');
				_errors = [];
				break;

			case CmeConstants.INITIALIZE:
				console.log('handling dispatched initialize action, data = \n', action.data);
				_cme['device'] = action.data;
				break;

			case CmeConstants.LOGIN:
				console.log('handling dispatched login action');
				_isLoggedIn = true;
				break;

			case CmeConstants.LOGOUT:
				console.log('handling dispatched logout action');
				_isLoggedIn = false;
				break;

			default: // not an action we're looking for - ignore
				return true;
		}

		// explicitely check here for REQUEST action
		// to reset the _isSubmitting bool
		if (action.actionType !== CmeConstants.REQUEST)
			_isSubmitting = false;

		CmeStore.emitChange(); // notify store changes

		return true; // No errors. Needed by promise in Dispatcher.
	})
});

module.exports = CmeStore;
