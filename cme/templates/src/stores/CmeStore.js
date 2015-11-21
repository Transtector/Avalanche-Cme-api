/*
 * CmeStore.js
 * james.brunner@kaelus.com
 *
 * Repository for the Cme application model.
*/

var AppDispatcher = require('../dispatcher/AppDispatcher');
var CmeConstants = require('../constants/CmeConstants');
var EventEmitter = require('events').EventEmitter;

var assign = require('object-assign'); // ES6 polyfill

var CHANGE_EVENT = 'change';

var _cme = {
	loggedIn: false,
	config: {
		device: {
			model: 'CME-1000A',
			serial: 'XX2016-ABC1',
			firmware: '0.1.0'
		}
	}
};

var CmeStore = assign({}, EventEmitter.prototype, {

	getState: function() {
		return _cme;
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
			case CmeConstants.LOGIN:
				console.log('handling dispatched login action');
				_cme.loggedIn = true;
				CmeStore.emitChange();
				break;
			case CmeConstants.LOGOUT:
				console.log('handling dispatched logout action');
				_cme.loggedIn = false;
				CmeStore.emitChange();
				break;
		}

		return true; // No errors. Needed by promise in Dispatcher.
	})

});

module.exports = CmeStore;