/**
 * CmeApp.jsx
 * james.brunner@kaelus.com
 *
 * Core monitoring engine top-level component.
 * This component operates as a "Controller-View".  It listens for changes
 * in the CmeStore and passes the new data to its children.
 */
var React = require('react');

var Header = require('./Header');
var Login = require('./Login');
var ConfigPanel = require('./ConfigPanel');
var HomePanel = require('./HomePanel');
var ErrorPanel = require('./ErrorPanel');

var Actions = require('../Actions');
var Constants = require('../Constants');
var Store = require('../Store');

var CmeApp = React.createClass({

	getInitialState: function () {
		return Store.getState();
	},

	componentDidMount: function() {
		Store.addChangeListener(this._onChange);
	},

	componentWillUnmount: function() {
		Store.removeChangeListener(this._onChange);
	},

	render: function() {

		function renderLoginOrConsole(state) {
			
			if (!state.isLoggedIn)
				return <Login errors={state.errors} isSubmitting={state.isSubmitting} />

			if (Object.keys(state.config).length == 0)
				return null;

			if (state.isConfigVisible)
				return <ConfigPanel clock={state.clock} 
									temperature={state.temperature}
									config={state.config} />

			return <HomePanel channels={state.channels}
							  clock={state.clock}
							  clockConfig={state.config.clock}
							  temperature={state.temperature}
							  temperatureConfig={state.config.temperature} />
		}

		function renderErrorPanel(state) {
			if (!state.isLoggedIn)
				return null;

			return <ErrorPanel errors={state.errors} />
		}

		return (
			<div>
				<Header device={this.state.device}
						isLoggedIn={this.state.isLoggedIn} />

				{renderLoginOrConsole(this.state)}

				{renderErrorPanel(this.state)}	

				<div id="test-buttons">
					<button onClick={this._testError}
							disabled={this.state.errors.length > 0}>Test Error</button>
				</div>
				
			</div>
		);
	},

	_onChange: function() {
		this.setState(Store.getState());
	},

	_testError: function() {
		Actions.injectError('This is a test');
	}
});

module.exports = CmeApp;