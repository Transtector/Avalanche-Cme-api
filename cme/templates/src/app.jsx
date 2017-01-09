/**
 * app.jsx
 * james.brunner@kaelus.com
 *
 * Entry point for the CME (core monitoring engine) web application.
 */

var React = require('react');
var ReactDOM = require('react-dom');
var Actions = require('./Actions');
var CmeApp = require('./components/CmeApp');
var CmeExport = require('./components/CmeExport');

// This script is the entry point for more than a single
// top-level page.  
if (document.getElementById('cmeapp')) {

	// Initialize the CmeStore.  This is written to more easily support
	// running the web app from a separate server than the Cme API.  Most
	// Cme API requests take success and failure callbacks.  These end up
	// being CmeActions that get dispatched and handled by the CmeStore.

	// Wait for these requests to complete - they initialize the Store.
	Actions.device()
		.always(Actions.login()
			.always(function () {
				ReactDOM.render(<CmeApp />, document.getElementById('cmeapp'));
			})
		);

} else if (document.getElementById('cmeexport')) {
 
	ReactDOM.render(<CmeExport />, document.getElementById('cmeexport'));

} else {

	alert('Something horrible went wrong!');
}

