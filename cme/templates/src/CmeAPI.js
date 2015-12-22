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

function jqXhrErrorMessage(jqXHR) {
	return jqXHR.responseJSON.join(',\n') + ' (status: ' + jqXHR.status + ')';
}

function configItemToUrl(item) {
	var config = Store.getState().config,
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
				var msg = jqXhrErrorMessage(jqXHR);
				debug('CmeAPI.device error: ', msg);
				failure([ msg ]);
			}
		});
	},

	// login with CME username, password credentials
	login: function(credentials, success, failure) {
		var u = credentials.u,
			p = $.md5(credentials.p);

		return $.ajax({
			url: API.login,
			data: { u: u, p: p },
			dataType: 'json',
			success: function(data) {

				if (!data.timestamp) {
					debug('Login failure: ', data);
					failure(data);
				} else {
					success(true);
				}
			},
			error: function(jqXHR, textStatus, errorThrown) {
				var msg = jqXhrErrorMessage(jqXHR);
				debug('CmeAPI.login error: ', msg);
				failure([ msg ]);
			}
		});
	},

	// just remove the session - ignore return value
	logout: function() { $.ajax({ url: API.logout }); },

	poll: function(url, success, failure) {
		$.ajax({
			url: API_ROOT + url,
			contentType: 'application/json; charset=UTF-8',
			dataType: 'json',
			success: success,
			error: function(jqXHR, textStatus, errorThrown) {
				var msg = jqXhrErrorMessage(jqXHR);
				debug('CmeAPI.poll error: ', msg);
				failure([ msg ]);
			}
		});
	},

	channel: function(chId, obj, success, failure) {
		var chIndex = parseInt(chId.slice(2)),
			method = obj ? 'POST' : 'GET',
			payload = obj ? JSON.stringify(obj) : null;

		$.ajax({
			type: method,
			url: API_ROOT + 'ch/' + chIndex, // /api/ch/0
			contentType: 'application/json; charset=UTF-8',
			data: payload,
			dataType: 'json',
			success: success,
			error: function(jqXHR, textStatus, errorThrown) {
				var msg = jqXhrErrorMessage(jqXHR);
				debug('CmeAPI.channel error: ', msg);
				failure([ msg ]);
			}
		});
	},

	channelControl: function(chId, controlId, state, success, failure) {
		var chIndex = parseInt(chId.slice(2)), // chId: "chX"
			ctrlIndex = parseInt(controlId.slice(1)); // controlId: "cY"

		$.ajax({
			type: 'POST',
			url: API_ROOT + 'ch/' + chIndex + '/controls/' + ctrlIndex, // /api/ch/0/controls/0
			contentType: 'application/json; charset=UTF-8',
			data: JSON.stringify({ state: state }),
			dataType: 'json',
			success: success,
			error: function(jqXHR, textStatus, errorThrown) {
				var msg = jqXhrErrorMessage(jqXHR);
				debug('CmeAPI.channelControl error: ', msg);
				failure([ msg ]);
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

		return $.ajax({
			type: method,
			url: url,
			contentType: 'application/json; charset=UTF-8',
			data: payload,
			dataType: 'json',
			success: function(data) {
				if (Object.keys(data)[0] === item) // did we get back what we requested?
					success(data);
				else
					failure([ "Config error with: " + item ]);
			},
			error: function(jqXHR, textStatus, errorThrown) {				
				var msg = jqXhrErrorMessage(jqXHR);
				debug('CmeAPI.config error: ', msg);
				failure([ msg ]);
			}
		});
	}
};

module.exports = CmeAPI;