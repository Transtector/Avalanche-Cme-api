'use strict';

var $ = require('jquery');
$.md5 = require('js-md5');

var CmeAPI = {

	// Try to retrieve the device info.  This does not require
	// authorized access, so no need to be logged into a session.
	initialize: function(success, failure) {
		return $.ajax({
			url: '/api/config/device',
			dataType: 'json',
			success: function(data) {
				console.log('[CmeAPI] initialize success:\n', data);

				// we got something back - check to see if it's
				// the CME device data else call the failure callback.
				if (!data.device)
					failure([ "Device data not readable." ]);
				else
					success(data.device);
			},
			error: function(jqXHR, textStatus, errorThrown) {
				console.log('[CmeAPI] initialize error:\n', textStatus);
				failure([ textStatus ]);
			}
		});
	},

	// login with CME username, password credentials
	login: function(credentials, success, failure) {
		var u = credentials.u,
			p = $.md5(credentials.p);

		$.ajax({
			url: '/api/login',
			data: { u: u, p: p },
			dataType: 'json',
			success: function(data) {

				if (!data._timestamp) {
					console.log('[CmeAPI] login failure:\n', data);
					failure(data);
				} else {
					console.log('[CmeAPI] login success:\n', data);
					success(data);
				}
			},
			error: function(jqXHR, textStatus, errorThrown) {
				console.log('[CmeAPI] login error:\n', textStatus);
				failure([ textStatus ]);
			}
		});
	},

	// just remove the session - ignore return value
	logout: function() {
		$.ajax({
			url: '/api/logout'
		});
	}
};

module.exports = CmeAPI;