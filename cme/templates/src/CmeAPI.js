'use strict';

var $ = require('jquery');
$.md5 = require('js-md5');

var DEBUG = true; // turn API console logging on/off

var API_ROOT = '/api/';

// use enumeration for API routes
var API = {
	device: API_ROOT + 'device',
	login: API_ROOT + 'login',
	logout: API_ROOT + 'logout',
	config: API_ROOT + 'config'
}

function debug(/* arguments */) {
	if (!DEBUG) return;
	console.log.apply(console, arguments);
}

var CmeAPI = {

	session: function(callback) {
		var validSession = false;

		return $.ajax({
			url: API_ROOT,
			dataType: 'json',
			success: function(data) {
				validSession = !!data._timestamp;
			},
			complete: function() { callback(validSession); }
		});
	},

	device: function(success, failure) {
		return $.ajax({
			url: API.device,
			dataType: 'json',
			success: function(data) {
				debug('Device success:\n', data);

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

	config: function(success, failure) {
		return $.ajax({
			url: API.config,
			dataType: 'json',
			success: function(data) {
				debug('Config success:\n', data);

				// we got something back - check to see if it's
				// the CME device data else call the failure callback.
				if (!data.config)
					failure([ "Device config not readable." ]);
				else
					success(data.config);
			},
			error: function(jqXHR, textStatus, errorThrown) {
				debug('Config error:\n', textStatus);
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

				if (!data._timestamp) {
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