/**
 * CmeApp.jsx
 * james.brunner@kaelus.com
 *
 * Core monitoring engine top-level component.
 * This component operates as a "Controller-View".  It listens for changes
 * in the CmeStore and passes the new data to its children.
 */
var React = require('react');

var Actions = require('../Actions');
var Constants = require('../Constants');
var Store = require('../Store');

var Header = require('./Header');
var Login = require('./Login');
var ConfigPanel = require('./ConfigPanel');
var HomePanel = require('./HomePanel');
var ErrorPanel = require('./ErrorPanel');

var CmeApp = React.createClass({

	getInitialState: function () {
		var state = Store.getState();

		return {
			isLoggedIn: state.isLoggedIn,
			ui_panel: state.ui_panel
		}
	},

	componentDidMount: function() {
		Store.addChangeListener(Constants.SESSION, this._onSessionChange);		
		Store.addChangeListener(Constants.UI_PANEL, this._onUiPanelChange);
	},

	componentWillUnmount: function() {
		Store.removeChangeListener(Constants.SESSION, this._onSessionChange);		
		Store.removeChangeListener(Constants.UI_PANEL, this._onUiPanelChange);
	},

	render: function() {

		return (
			<div>
				<Header />

				<Login />
				
				{ this._renderUiPanel() }

				<ErrorPanel />

				<div id="test-buttons">
					<button onClick={this._testError}
							disabled={this.state.errors && this.state.errors.length > 0}>Test Error</button>
				</div>
			</div>
		);
	},

	_renderUiPanel: function() {

		if (!this.state.isLoggedIn)
			return null;

		switch (this.state.ui_panel) {

			case 'config':
				return <ConfigPanel />

			default: // 'home'
				return <HomePanel />
		}

	},

	_onSessionChange: function() {
		this.setState({ isLoggedIn: Store.getState().isLoggedIn });
	},

	_onUiPanelChange: function() {
		this.setState({ ui_panel: Store.getState().ui_panel });
	},

	_testError: function() {
		Actions.injectError('This is a test');
	}
});

module.exports = CmeApp;