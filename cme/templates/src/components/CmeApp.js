/**
 * CmeApp.js
 * james.brunner@kaelus.com
 *
 * Core monitoring engine top-level component.
 * This component operates as a "Controller-View".  It listens for changes
 * in the CmeStore and passes the new data to its children.
 */

var Header = require('./Header');
var Login = require('./Login');
// var MainSection = require('./MainSection');
// var Config = require('./Config');

var CmeStore = require('../stores/CmeStore');

var CmeApp = React.createClass({

	getInitialState: function() {
		return CmeStore.getState();
	},

	componentDidMount: function() {
		CmeStore.addChangeListener(this._onChange);
	},

	componentWillUnmount: function() {
		CmeStore.removeChangeListener(this._onChange);
	},

	render: function() {
		return (
			<div>
				<Header	device={this.state.config.device}
					isLoggedIn={this.state.loggedIn} />

				{!this.state.loggedIn ? <Login /> : null}
			</div>
		);
	},

	_onChange: function() {
		var cme = CmeStore.getState();
		console.log('CmeApp view-controller heard a change!');
		console.log('cme.loggedIn = ' + cme.loggedIn);
		this.setState(cme);
	}
});

module.exports = CmeApp;