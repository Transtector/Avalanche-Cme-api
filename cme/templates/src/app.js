/**
 * app.js
 * james.brunner@kaelus.com
 *
 * Entry point for the CME (core monitoring engine) web application.
 */

var React = require('react');
var ReactDOM = require('react-dom');

var Actions = require('./Actions');
var CmeApp = require('./components/CmeApp');

// Initialize the CmeStore.  This is written to more easily support
// running the web app from a separate server than the Cme API.  Most
// Cme API requests take success and failure callbacks.  These end up
// being CmeActions that get dispatched and handled by the CmeStore.

// Wait for these requests to complete - they initialize the Store.
Actions.session().always(Actions.device().always(function () {
	console.log("rendering the app...");
	ReactDOM.render(<CmeApp />, document.getElementById('cmeapp'));
}));