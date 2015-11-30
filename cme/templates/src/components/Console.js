/**
 * Console.js
 * james.brunner@kaelus.com
 *
 * A small wrapper component for the primary interactive console 'panels'
 * of the web application.
 */

var React = require('react');

var Store = require('../Store');

var ConfigPanel = require('./ConfigPanel');
var HomePanel = require('./HomePanel');

var Console = React.createClass({

	getInitialState: function() {
		return {
			isConfigVisible: Store.getState().isConfigVisible
		}
	},

	componentDidMount: function() {
		Store.addChangeListener(this._onChange);
	},

	componentWillUnmount: function() {
		Store.removeChangeListener(this._onChange);
	},

	render: function() {
		return (
			<div id="console">

				{this.state.isConfigVisible
					? <ConfigPanel />
					: <HomePanel />
				}

				<div className="panel" id="error">
					<div className="message">
						ERRORS SHOWN HERE
					</div>
				</div>
			</div>
		);
	},

	_onChange: function() {
		this.setState({ isConfigVisible: Store.getState().isConfigVisible });
	}
});

module.exports = Console;