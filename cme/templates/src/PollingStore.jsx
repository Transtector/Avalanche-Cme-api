/*
 * PollingStore.jsx
 * james.brunner@kaelus.com
 *
 * Repository for the Cme application model - specifically items that
 * may be used in polling for hardware updates.
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

var _logs = [];
var _updates = { pending: false, usb: [], web: [], uploads: [] };
var _channels = [];
var _channel_objs = {};
var _clock;
var _temperature;

var PollingStore = assign({}, EventEmitter.prototype, {

	getState: function() {
		return {
			channels: _channels, // [ <channel_id> ], list of active channels
			channel_objs: _channel_objs, // holds the actual channel objects by channel id { chX: <channel_object> }
			logs: _logs, // [ { filename <string>: size <int> } ]
			updates: _updates, // hash of available updates and their sources
			clock: _clock, // <ISO-8601 string>, CPU datetime, UTC
			temperature: _temperature // <float>, CPU temperature degree C
		}
	},

	emitChange: function(changeType) {
		this.emit(changeType);
	},

	addChangeListener: function(changeType, callback) {
		this.on(changeType, callback);
	},

	removeChangeListener: function(changeType, callback) {
		this.removeListener(changeType, callback);
	},

	dispatcherIndex: AppDispatcher.register(function(action) {

		switch(action.actionType) {

			case Constants.CLOCK: // clock response
				_clock = action.data.clock;
				PollingStore.emitChange(Constants.ChangeTypes.CLOCK);
				break;

			case Constants.TEMPERATURE: // cpu temperature response
				_temperature = action.data.temperature;
				PollingStore.emitChange(Constants.ChangeTypes.TEMPERATURE);
				break;

			case Constants.LOGS: // cme log files
				_logs = action.data.logs;
				PollingStore.emitChange(Constants.ChangeTypes.LOGS);
				break;

			case Constants.UPDATES: // cme update images
				_updates = action.data.updates;
				PollingStore.emitChange(Constants.ChangeTypes.UPDATES);
				break;

			case Constants.CHANNELS: // status/channels response
				_channels = action.data.channels.sort();
				PollingStore.emitChange(Constants.ChangeTypes.CHANNELS);
				break;

			case Constants.CHANNEL:
				// action.data = { chX: <channelX> }
				var ch_id = Object.keys(action.data)[0];

				_channel_objs[ch_id] = action.data[ch_id];
				PollingStore.emitChange(Constants.ChangeTypes.CHANNEL);
				break;

			case Constants.CONTROL:
				// action.data = { 'chX:cY': <controlY> }
				var id = Object.keys(action.data)[0],
					keys = id.split(':'),
					ch_index = parseInt(keys[0].slice(2)),
					c_index = parseInt(keys[1].slice(1));

				assign(_channels[ch_index].controls[c_index], action.data[id]);
				PollingStore.emitChange(Constants.ChangeTypes.CONTROL);
				break;

			default: // unknown action
				// ignore
		}

		return true; // No errors. Needed by promise in Dispatcher.
	})
});

module.exports = PollingStore;
