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
	channels: API_ROOT + 'channels',
	channel: API_ROOT + 'ch/'
}

// Use Store to get the CME config object
var Store = require('./Store');
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

	device: function() {
		return $.ajax({
			url: API.device,
			dataType: 'json'
		});
	},

	config: function(obj) {
		var url, payload, method;

		if (!obj) { // just GET config
			url = API.config;
			method = 'GET';
			payload = null;
		} else { // called w/obj - POST update
			url = API.config + configItemToUrl(item);
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

	reset: function(reset_network, reset_clock) {
		return $.ajax({
			url: API.config + 'reset',
			data: JSON.stringify({ reset_network: reset_network, reset_clock: reset_clock }),
			dataType: 'json'
		});
	},

	restart: function() {
		return $.ajax({
			url: API.restart,
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

	channel: function(chId, ch_read_config, obj) {
		var chIndex = parseInt(chId.slice(2)),
			method = obj ? 'POST' : 'GET',
			payload = obj 
				? JSON.stringify(obj) 
				: ch_read_config
					? ch_read_config
					: null;

		return $.ajax({
			type: method,
			url: API.channel + chIndex, // /api/ch/0
			data: payload,
			dataType: 'json',
			contentType: 'application/json; charset=UTF-8'
		});
	},

	control: function(chId, controlId, obj) {
		var chIndex = parseInt(chId.slice(2)), // chId: "chX"
			ctrlIndex = parseInt(controlId.slice(1)); // controlId: "cY"

		return $.ajax({
			type: 'POST',
			url: API.channels + chIndex + '/controls/' + ctrlIndex, // /api/ch/0/controls/0
			contentType: 'application/json; charset=UTF-8',
			data: JSON.stringify(obj),
			dataType: 'json'
		});
	}
};

module.exports = CmeAPI;