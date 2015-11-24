/**
 * CmeApp.js
 * james.brunner@kaelus.com
 *
 * Core monitoring engine top-level component.
 * This component operates as a "Controller-View".  It listens for changes
 * in the CmeStore and passes the new data to its children.
 */
var React = require('react');

var Header = require('./Header');
var Login = require('./Login');
// var MainSection = require('./MainSection');
// var Config = require('./Config');

var CmeStore = require('../stores/CmeStore');

function displayLogin(errors, isSubmitting) {
	return (
		<Login errors={errors} isSubmitting={isSubmitting} />
	);
}

function displayConsole() {
	return (
		<div className="error-panel">
			ERRORS HERE!
		</div>
	);
}

var CmeApp = React.createClass({

	getInitialState: function () {
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
				<Header	device={this.state.cme.device}
					isLoggedIn={this.state.isLoggedIn} />

				{!this.state.isLoggedIn
					? displayLogin(this.state.errors, this.state.isSubmitting)
					: displayConsole()
				}
			</div>
		);
	},

	_onChange: function() {
		this.setState(CmeStore.getState());
	}
});

module.exports = CmeApp;