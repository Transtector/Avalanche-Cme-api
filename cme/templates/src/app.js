/**
 * app.js
 * james.brunner@kaelus.com
 *
 * Entry point for the CME (core monitoring engine) web application.
 */

var CmeApp = require('./components/CmeApp');

React.render(<CmeApp />, document.getElementById('cmeapp'));