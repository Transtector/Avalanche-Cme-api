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

// This script is also called as the entry point for
// the export.html page.  In that case there is nothing
// really to do, so just return.
if (document.getElementById('cme-export')) {

	alert('This is the export page!');

} else {


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

}