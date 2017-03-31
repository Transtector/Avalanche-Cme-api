/**
 * CmeAPI.js
 * james.brunner@kaelus.com
 *
 * Client side AJAX wrapper library for Cme API.
 */
'use strict';

var DEBUG = true; // turn API console logging on/off
function debug(/* arguments */) {
	if (!DEBUG) return;
	console.log.apply(console, arguments);
}

var $ = require('jquery');
$.md5 = require('js-md5');

// API routes
var API_ROOT = '/api/';
var API = {
	device: API_ROOT + 'device/',
	updates: API_ROOT + 'device/updates',
	restart: API_ROOT + 'device/restart',
	config: API_ROOT + 'config/',
	user: API_ROOT + 'user/',
	login: API_ROOT + 'login',
	logout: API_ROOT + 'logout',
	clock: API_ROOT + 'clock',
	temperature: API_ROOT + 'temperature',
	logs: API_ROOT + 'logs/',
	channels: API_ROOT + 'channels/',
	channel: API_ROOT + 'ch/'
	channel: 		API_ROOT + 'ch/',
	alarms: 		API_ROOT + 'alarms/'
}

// Use Store to get the CME config object
var Store = require('./Store');

var CmeAPI = {

	device: function(dev) {
		return $.ajax({
			url: API.device,
			type: dev ? 'POST' : 'GET',
			contentType: 'application/json; charset=UTF-8',
			data: dev ? JSON.stringify(dev) : null,
			dataType: 'json'		
		});
	},

	config: function(obj) {
		
		function configItemToUrl(item) {
			var config = Store.getState().config,
				itemUrl = '';

			if (item === 'config') // top-level config object
				return '';

			if (config[item] !== undefined) // first level config group
				return item + '/';

			// else we have to search for the item in the config groups
			// (note: this needs to change if we want to support deeper config object)
			for (var group in config) {
				if (config[group][item] !== undefined) {
					itemUrl = group + '/' + item;
					break;
				}
			}

			if (itemUrl === '')
				debug("Developer error (should never get here).  Converting config url for ", item);

			return itemUrl;
		}

		var url, payload, method;

		if (!obj) { // just GET config
			url = API.config;
			method = 'GET';
			payload = null;
		} else { // called w/obj - POST update
			url = API.config + configItemToUrl(Object.keys(obj)[0]);
			payload = JSON.stringify(obj);
			method = 'POST';
		}

		return $.ajax({
			type: method,
			url: url,
			contentType: 'application/json; charset=UTF-8',
			data: payload,
			dataType: 'json'
		});
	},

	restart: function(recovery_mode, factory_reset) {
		return $.ajax({
			url: API.restart,
			data: { recovery_mode: !!recovery_mode, factory_reset: !!factory_reset },
			dataType: 'json'
		});
	},

	// login with CME username, password credentials
	login: function(u, p) {
		return $.ajax({
			url: API.login,
			data: { u: u, p: $.md5(p) }, // send MD5 hash of p
			dataType: 'json'
		});
	},

	// just remove the session - ignore return value
	logout: function() { return $.ajax({ url: API.logout }); },

	// update username, password credentials
	user: function(u, p) {
		return $.ajax({
			type: 'POST',
			url: API.user,
			data: JSON.stringify({ user: { username: u, password: $.md5(p) }}),
			dataType: 'json',
			contentType: 'application/json; charset=UTF-8'
		});
	},

	logs: function(retrieve) {

		if (!retrieve) {

			return $.ajax({
				url: API.logs,
				dataType: 'json'
			});
		}

		// else retrieve the identified log file
		var name = retrieve.name;
		var download = retrieve.download;
		var clear = retrieve.clear;

		// prepare a new base URL for the request
		var url = window.location.protocol + '//' + window.location.host + API.logs + name;
		var qs = [];

		if (download) {
			qs.push('download=true');
		}
		if (clear) {
			qs.push('clear=true');
		}
		qs = qs.join('&');

		if (qs.length > 0)
			url += '?' + qs;

		debug("attempting to open `" + url + "`");

		window.open(url, (!download ? "_blank" : null));
	},

	getUpdates: function() {
		return $.ajax({
			url: API.updates,
			dataType: 'json'
		});
	},

	deleteUpdate: function(s) {
		return $.ajax({
			url: API.updates,
			type: 'DELETE',
			dataType: 'json'
		});
	},

	uploadUpdate: function(formData, progressHandler) {

		return $.ajax({
			url: API.updates,
			type: 'POST',

			data: formData,

			cache: false,
			contentType: false,
			processData: false,

			dataType: 'json',

			xhr: function() {
				var x = $.ajaxSettings.xhr();
				if (progressHandler && x.upload) {
					x.upload.addEventListener('progress', progressHandler, false);
				}
				return x;
			}
		});
	},

	installUpdate: function(source, name) {

		return $.ajax({
			url: API.updates,
			type: 'PUT',

			contentType: 'application/json; charset=UTF-8',
			data: JSON.stringify({ source: source, name: name }),

			dataType: 'json'
		});
	},

	clock: function() {
		return $.ajax({
			url: API.clock,
			dataType: 'json'
		});
	},

	temperature: function() {
		return $.ajax({
			url: API.temperature,
			dataType: 'json'
		});
	},

	channels: function() {
		return $.ajax({
			url: API.channels,
			dataType: 'json'
		});
	},

	channel: function(id, config, history, alarms) {
		var ch_index = parseInt(id.slice(2)),
			method = (config && !history) ? 'POST' : 'GET',
			payload = (config && !history) ? JSON.stringify(config) : null,
			url = API.channel + ch_index,
			qs = [];

		// add query string to get history
		if (method == 'GET') {
			
			if (history) {
				qs.push($.param(history));
			}

			if (alarms) {
				qs.push($.param({a: 1}));
			}

			if (qs.length > 0)
				url = url + '?' + qs.join('&');
		}

		return $.ajax({
			type: method,
			url: url,
			data: payload,
			dataType: 'json',
			contentType: 'application/json; charset=UTF-8'
		});
	},

	channelHistory: function(id, history) {
		var url = API.channel + parseInt(id.slice(2)) + '/history/';
		
		url += encodeURIComponent(history.h);
		url += '?s=' + encodeURIComponent(history.s);
		url += '&e=' + encodeURIComponent(history.e);

		return $.ajax({
			url:  url,
			dataType: 'json',
			contentType: 'application/json; charset=UTF-8'
		});
	},

	channelAlarms: function(id, alarms) {
		var url = API.channel + parseInt(id.slice(2)) + '/alarms/';

		url += '?s=' + encodeURIComponent(alarms.s);
		url += '&e=' + encodeURIComponent(alarms.e);

		return $.ajax({
			url:  url,
			dataType: 'json',
			contentType: 'application/json; charset=UTF-8'
		});
	},

	channelConfig: function(id) {
		return $.ajax({
			url: API.channel + parseInt(id.slice(2)) + '/config',
			data: null,
			dataType: 'json',
			contentType: 'application/json; charset=UTF-8'
		});
	},

	deleteChannel: function(ch_id) {
		var ch_index = parseInt(ch_id.slice(2));

		return $.ajax({
			type: 'DELETE',
			url: API.channel + ch_index,
			dataType: 'json',
			contentType: 'application/json; charset=UTF-8'
		});
	},

	sensorHistory: function(ch_id, sensor_id, history) {
		var url = API.channel + parseInt(ch_id.slice(2)) + '/sensors/' + parseInt(sensor_id.slice(1)) + '/history/';
		url += encodeURIComponent(history.h) + '?s=' + encodeURIComponent(history.s) + '&e=' + encodeURIComponent(history.e);

		return $.ajax({
			url:  url,
			dataType: 'json',
			contentType: 'application/json; charset=UTF-8'
		});
	},

	alarms: function(alarms) {
		var url = API.alarms;

		if (alarms.c || alarms.s || alarms.e){
			url += '?' + $.param(alarms);
		}

		return $.ajax({
			url:  url,
			dataType: 'json',
			contentType: 'application/json; charset=UTF-8'
		});
	},

	fakeAlarms: function() {
		
		return $.ajax({
			url:  API.alarms + 'fake',
			dataType: 'json',
			contentType: 'application/json; charset=UTF-8'
		});
	},

	thresholds: function(ch_id, sensor_id, thresholds) {
		var ch_index = parseInt(ch_id.slice(2)),
			s_index = parseInt(sensor_id.slice(1)),
		
			url = API.channel + ch_index + '/sensors/' + s_index + '/thresholds/';

		// if thresholds is empty or null, just DELETE to /thresholds/ to remove all
		if (!thresholds || thresholds.length == 0) {
			// remove all thresholds
			debug("Removing all thresholds from " + ch_id + ":" + sensor_id);

			return $.ajax({
				type: 'DELETE',
				url: url,
				dataType: 'json',
				contentType: 'application/json; charset=UTF-8'
			});
		}

		// else loop through each threshold and POST or DELETE as necessary
		var ajaxCalls = [];
		thresholds.forEach(function (th) {
			// blank id with a value means create (POST) new threshold
			if (!th.id && th.value) {
				debug("Adding new threshold to " + ch_id + ":" + sensor_id);

				ajaxCalls.push($.ajax({
					type: 'POST',
					url: url,
					dataType: 'json',
					data: JSON.stringify(th),
					contentType: 'application/json; charset=UTF-8'
				}));
			}

			// non-blank id with empty value means remove (DELETE) the threshold
			if (th.id && !th.value) {
				debug("Removing existing threshold from " + ch_id + ":" + sensor_id);

				ajaxCalls.push($.ajax({
					type: 'DELETE',
					url: url + th.id,
					dataType: 'json',
					contentType: 'application/json; charset=UTF-8'
				}));
			
			}

			// non-blank id with non-empty (valid) value means update (POST)
			if (th.id && th.value) {
				debug("Modifying existing threshold on " + ch_id + ":" + sensor_id);

				ajaxCalls.push($.ajax({
					type: 'POST',
					url: url + th.id,
					dataType: 'json',
					data: JSON.stringify(th),
					contentType: 'application/json; charset=UTF-8'
				}));
			}
		});

		// refresh entire channel when done processing Thresholds
		return $.when(ajaxCalls).done(function() {
			CmeAPI.channel(ch_id);
		});		
	}
};

module.exports = CmeAPI;