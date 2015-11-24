/**
 * app.js
 * james.brunner@kaelus.com
 *
 * Entry point for the CME (core monitoring engine) web application.
 */

var React = require('react');
var ReactDOM = require('react-dom');

var CmeActions = require('./actions/CmeActions');
var CmeApp = require('./components/CmeApp');

// Initialize the CmeStore.  This is written to more easily support
// running the web app from a separate server than the Cme API.  Most
// Cme API requests take success and failure callbacks.  These end up
// being CmeActions that get dispatched and handled by the CmeStore.

CmeActions.initialize(/* pass cme host info, */).then(function () {

	ReactDOM.render(<CmeApp />, document.getElementById('cmeapp'));

});