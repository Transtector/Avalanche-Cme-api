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
	device: API_ROOT + 'device/',
	config: API_ROOT + 'config/',
	user: API_ROOT + 'user/',
	login: API_ROOT + 'login',
	logout: API_ROOT + 'logout'
}

function jqXhrErrorMessage(jqXHR) {
	if (jqXHR.responseJSON)
		return jqXHR.responseJSON.join(',\n') + ' (status: ' + jqXHR.status + ')';
	return jqXHR.responseText;
}

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

var CmeAPI = {

	factoryReset: function(success, failure) {

		function onError(jqXHR, textStatus, errorThrown) {
			failure("Error performing factory reset:\nstatus: " + jqXHR.status + " - " + textStatus);
		}

		return $.ajax({
			url: API.config + 'factoryReset',
			dataType: 'json',
			success: function(data, textStatus, jqXHR) {
				if (jqXHR.status !== 200) {
					debug('CMEAPI.factoryReset error: ', data);
					onError(jqXHR, textStatus, data);
				} else {
					success();
				}
			},
			error: onError

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

	// update username, password credentials
	user: function(u, p, success, failure) {
		return $.ajax({
			type: 'POST',
			url: API.user,
			data: JSON.stringify({ user: { username: u, password: $.md5(p) }}),
			dataType: 'json',
			contentType: 'application/json; charset=UTF-8',
			success: function(data, textStatus, jqXHR) {
				if (jqXHR.status !== 200) {
					debug('CmeAPI.user error: ', data);
					failure(data);
				} else {
					success(data);
				}
			},
			error: function(jqXHR, textStatus, errorThrown) {
				var msg = jqXhrErrorMessage(jqXHR);
				debug('CmeAPI.user error: ', msg);
				failure([ msg ]);
			}

		});
	},

	// just remove the session - ignore return value
	logout: function() { return $.ajax({ url: API.logout }); },

	poll: function(url, success, failure) {
		return $.ajax({
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

		return $.ajax({
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

	control: function(chId, controlId, obj, success, failure) {
		var chIndex = parseInt(chId.slice(2)), // chId: "chX"
			ctrlIndex = parseInt(controlId.slice(1)); // controlId: "cY"

		return $.ajax({
			type: 'POST',
			url: API_ROOT + 'ch/' + chIndex + '/controls/' + ctrlIndex, // /api/ch/0/controls/0
			contentType: 'application/json; charset=UTF-8',
			data: JSON.stringify(obj),
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