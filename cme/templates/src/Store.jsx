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

var _device = {};
var _config = {};
var _errors = [];
var _isLoggedIn = false;
var _isSubmitting = false;
var _ui_panel = 'home';
var _logs = [];
var _updates = { pending: false, usb: [], web: [], uploads: [] };
var _channels = [];
var _channel_objs = {};
var _clock;
var _temperature;

var Store = assign({}, EventEmitter.prototype, {

	getState: function() {
		return {
			device: _device, // { modelNumber: <string>, serialNumber: <string>, firmware: <string> }
			config: _config, // { <cme_config> }
			errors: _errors, // [ <string> ]

			// UI-polled states:

			channels: _channels, // [ <channel_id> ], list of active channels
			channel_objs: _channel_objs, // holds the actual channel objects by channel id { chX: <channel_object> }
			logs: _logs, // [ { filename <string>: size <int> } ]
			updates: _updates, // hash of available updates and their sources
			clock: _clock, // <ISO-8601 string>, CPU datetime, UTC
			temperature: _temperature, // <float>, CPU temperature degree C

			// generally UI-specific states follow:

			isLoggedIn: _isLoggedIn, // set via CmeAPI.session(callback(<bool>)); true if valid session
			isSubmitting: _isSubmitting, // Actions that make server requests set this true before request
			ui_panel: _ui_panel // what's displayed in the main page body
		}
	},

	emitChange: function(eventName) {
		//console.log("Store: firing emitChange(" + eventName + ")!")		
		this.emit(eventName);
	},

	addChangeListener: function(eventName, callback) {

		this.on(eventName, callback);
	},

	removeChangeListener: function(eventName, callback) {

		this.removeListener(eventName, callback);
	},

	dispatcherIndex: AppDispatcher.register(function(action) {
		
		var event = action.actionType;

		switch(event) {

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
				_errors.push(action.data);
				break;

			case Constants.CLEAR_ERRORS:
				_errors = [];
				event = Constants.ERROR; // trigger listeners to update errors state
				break;

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

			case Constants.UI_PANEL:

				_ui_panel = action.data.toLowerCase();
				break;

			case Constants.CLOCK: // clock response
				_clock = action.data.clock;
				break;

			case Constants.TEMPERATURE: // cpu temperature response
				_temperature = action.data.temperature;
				break;

			case Constants.LOGS: // cme log files
				_logs = action.data.logs;
				break;

			case Constants.UPDATES: // cme update images
				_updates = action.data.updates;
				break;

			case Constants.CHANNELS: // status/channels response
				_channels = action.data.channels;
				break;

			case Constants.CHANNEL:
				// action.data = { chX: <channelX> }
				var ch_id = Object.keys(action.data)[0];

				// TESTING CH ERROR
				//action.data[ch_id].error = "This is a test.";

				_channel_objs[ch_id] = action.data[ch_id];

				// add the channel id to the event
				event += ch_id.toUpperCase()

				break;

			default: // unknown action
				event = null;
				// ignore
		}

		// explicitly check here for REQUEST action
		// to reset the _isSubmitting bool
		if (event && event !== Constants.REQUEST)
			_isSubmitting = false;

		if (event)
			Store.emitChange(event); // notify store changes

		return true; // No errors. Needed by promise in Dispatcher.
	})
});

module.exports = Store;
