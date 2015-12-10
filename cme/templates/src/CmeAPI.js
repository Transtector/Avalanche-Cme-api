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

var Store = require('./Store'); // to get the CME config object

var API_ROOT = '/api/';

// use enumeration for API routes
var API = {
	device: API_ROOT + 'device',
	login: API_ROOT + 'login',
	logout: API_ROOT + 'logout',
	config: API_ROOT + 'config'
}

function configItemToUrl(item) {
	var config = Store.getState().cme['config'],
		itemUrl = '';

	if (item === 'config') // top-level config object
		return '';

	if (config[item] !== undefined) // first level config group
		return '/' + item;

	var itemUrl = '';

	// else we have to search for the item in the config groups
	// (note: this needs to change if we want to support deeper config object)
	for (var group in config) {
		if (config[group][item] !== undefined) {
			itemUrl = '/' + group + '/' + item;
			break;
		}
	}

	if (itemUrl === '')
		debug("Developer error (should never get here).  Converting config url for ", item);

	return itemUrl;
}

var CmeAPI = {

	session: function(callback) {
		var validSession = false;

		return $.ajax({
			url: API_ROOT,
			dataType: 'json',
			success: function(data) {
				validSession = !!data.timestamp;
			},
			complete: function() { callback(validSession); }
		});
	},

	device: function(success, failure) {
		return $.ajax({
			url: API.device,
			dataType: 'json',
			success: function(data) {
				// we got something back - check to see if it's
				// the CME device data else call the failure callback.
				if (!data.device)
					failure([ "Device data not readable." ]);
				else
					success(data.device);
			},
			error: function(jqXHR, textStatus, errorThrown) {
				debug('Device error:\n', textStatus);
				failure([ textStatus ]);
			}
		});
	},

	poll: function(url, success, failure) {
		$.ajax({
			url: API_ROOT + url,
			contentType: 'application/json; charset=UTF-8',
			dataType: 'json',
			success: success,
			error: function(jqXHR, textStatus, errorThrown) {
				debug('Poll error: ', textStatus);
				failure([ textStatus ]);
			}
		});
	},

	config: function(obj, success, failure) {
		var item, url, payload, method;

		if (!obj) { // just GET config
			url = API.config;
			item = 'config';
			method = 'GET';
			payload = null;
		} else { // called w/ (obj, success, failure)...POST update
			item = Object.keys(obj)[0];
			url = API.config + configItemToUrl(item);
			payload = JSON.stringify(obj);
			method = 'POST';
		}

		$.ajax({
			type: method,
			url: url,
			contentType: 'application/json; charset=UTF-8',
			data: payload,
			dataType: 'json',
			success: function(data) {
				debug('Config success: ', data);

				if (Object.keys(data)[0] === item) // did we get back what we requested?
					success(data);
				else
					failure([ "Config error with: " + item ]);
			},
			error: function(jqXHR, textStatus, errorThrown) {
				debug('Config update error: ', textStatus);
				failure([ textStatus ]);
			}
		});
	},

	// login with CME username, password credentials
	login: function(credentials, success, failure) {
		var u = credentials.u,
			p = $.md5(credentials.p);

		$.ajax({
			url: API.login,
			data: { u: u, p: p },
			dataType: 'json',
			success: function(data) {

				if (!data.timestamp) {
					debug('Login failure: ', data);
					failure(data);
				} else {
					debug('Login success: ', data);
					success(data);
				}
			},
			error: function(jqXHR, textStatus, errorThrown) {
				debug('Login error: ', textStatus);
				failure([ textStatus ]);
			}
		});
	},

	// just remove the session - ignore return value
	logout: function() {
		$.ajax({
			url: API.logout
		});
	}
};

module.exports = CmeAPI;