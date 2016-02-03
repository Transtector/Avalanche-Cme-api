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

var _device = {};
var _config = {};
//var _channels = [];
//var _clock;
//var _temperature;
var _errors = [];
var _isLoggedIn = false;
var _isSubmitting = false;
var _isConfigVisible = false;

var Store = assign({}, EventEmitter.prototype, {

	getState: function() {
		return {
			device: _device, // { modelNumber: <string>, serialNumber: <string>, firmware: <string> }
			config: _config, // { <cme_config> }
			errors: _errors, // [ <string> ]

//			channels: _channels, // [ <channel> ]
//			clock: _clock, // <ISO-8601 string>, CPU datetime, UTC
//			temperature: _temperature, // <float>, CPU temperature degree C

			// generally UI-specific states follow:

			isLoggedIn: _isLoggedIn, // set via CmeAPI.session(callback(<bool>)); true if valid session
			isSubmitting: _isSubmitting, // Actions that make server requests set this true before request

			isConfigVisible: _isConfigVisible // show/hide the main configuration panel
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

			case Constants.DEVICE: // a device object has been replied
				_device = action.data;
				break;

			case Constants.SESSION: // a session object has been replied
				// set the _isLoggedIn state (login/logout actions update the session)
				_isLoggedIn = action.data;
				break;

			case Constants.ERROR:
				_errors = Array.isArray(action.data) ? action.data : [action.data];
				break;

			case Constants.CLEAR_ERRORS:
				_errors = [];
				break;

			case Constants.SHOW_HOME:
				_isConfigVisible = false;
				break;

			case Constants.SHOW_CONFIG:
				_isConfigVisible = true;
				break;

//			case Constants.CLOCK: // clock response
//				_clock = action.data.clock;
//				break;

//			case Constants.TEMPERATURE: // cpu temperature response
//				_temperature = action.data.temperature;
//				break;

//			case Constants.CHANNELS: // status/channels response
//				_channels = [ action.data.channels[0] ];
//				break;

//			case Constants.CHANNEL:
				// action.data = { chX: <channelX> }
//				var id = Object.keys(action.data)[0],
//					ch_index = parseInt(id.slice(2));

//				assign(_channels[ch_index], action.data[id]);
//				break;

//			case Constants.CONTROL:
				// action.data = { 'chX:cY': <controlY> }
//				var id = Object.keys(action.data)[0],
//					keys = id.split(':'),
//					ch_index = parseInt(keys[0].slice(2)),
//					c_index = parseInt(keys[1].slice(1));

//				assign(_channels[ch_index].controls[c_index], action.data[id]);
//				break;

			case Constants.CONFIG:
				// item key name:
				var item = Object.keys(action.data)[0];

				if (item === 'config') {

					_config = action.data[item];

				} else if (_config[item] !== undefined) {

					_config[item] = action.data[item] || {};

				} else {

					for (var group in _config) {

						if (_config[group][item] !== undefined) {
							_config[group][item] = (action.data[item] !== null || action.data[item] !== undefined) 
								? action.data[item]
								: '';
							break;
						}

					}

				}
				break;

			default: // unknown action
				// ignore
		}

		// explicitly check here for REQUEST action
		// to reset the _isSubmitting bool
		if (action.actionType !== Constants.REQUEST)
			_isSubmitting = false;

		Store.emitChange(); // notify store changes

		return true; // No errors. Needed by promise in Dispatcher.
	})
});

module.exports = Store;
