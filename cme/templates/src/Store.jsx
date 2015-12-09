/*
 * Store.jsx
 * james.brunner@kaelus.com
 *
 * Repository for the Cme application model.
*/
'use strict';
var DEBUG = true;
function debug(/* arguments */) {
	if (!DEBUG) return;
	console.log.apply(console, arguments);
}

var AppDispatcher = require('./AppDispatcher');
var Constants = require('./Constants');
var EventEmitter = require('events').EventEmitter;

var assign = require('object-assign'); // ES6 polyfill

var CHANGE_EVENT = 'change';

var _cme = {};
var _errors = [];
var _isLoggedIn = false;
var _isSubmitting = false;
var _isConfigVisible = false;

var Store = assign({}, EventEmitter.prototype, {

	getState: function() {
		return {
			cme: _cme,
			errors: _errors,
			isLoggedIn: _isLoggedIn,
			isSubmitting: _isSubmitting,
			isConfigVisible: _isConfigVisible
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

			case Constants.REQUEST: // a request has been submitted to server
				_isSubmitting = true;
				break;

			case Constants.TIME: // cme time responds
				_cme.config.time.current = action.data['current'];
				break;

			case Constants.SESSION: // a session object has been replied
				_isLoggedIn = action.data;
				break;

			case Constants.DEVICE: // a device object has been replied
				_cme['device'] = action.data;
				break;

			case Constants.ERROR:
				debug('handling dispatched error action: ', action.data);
				_errors = Array.isArray(action.data) ? action.data : [action.data];
				break;

			case Constants.CLEAR_ERRORS:
				_errors = [];
				break;

			case Constants.LOGIN: // a valid login has been obtained
				_isConfigVisible = false;
				_isLoggedIn = true;
				break;

			case Constants.LOGOUT: // session has been logged out
				_isConfigVisible = false;
				_isLoggedIn = false;
				break;

			case Constants.HOME:
				_isConfigVisible = false;
				break;

			case Constants.CONFIG:
				_isConfigVisible = true;

				// item key name:
				var item = Object.keys(action.data)[0];

				if (item === 'config') {

					_cme['config'] = action.data[item];

				} else if (_cme['config'][item] !== undefined) {

					_cme['config'][item] = action.data[item] || {};

				} else {

					for (var group in _cme['config']) {

						if (_cme['config'][group][item] !== undefined) {
							_cme['config'][group][item] = action.data[item] || '';
							break;
						}

					}

				}
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
