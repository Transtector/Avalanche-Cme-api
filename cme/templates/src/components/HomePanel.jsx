/**
 * HomePanel.jsx
 * james.brunner@kaelus.com
 *
 * CME status indicators site in the Home panel.
 */
var React = require('react');

var Store = require('../Store');

var HomePanel = React.createClass({

	getInitialState: function () {
		return { cme: Store.getState().cme.status };
	},

	componentDidMount: function() {
		Store.addChangeListener(this._onChange);
	},

	componentWillUnmount: function() {
		Store.removeChangeListener(this._onChange);
	},

	render: function () {
		return (
			<div className="panel" id="home">
				<div className="title">Status</div>
				<span>Sensors will show here...</span>
			</div>
		);
	},

	_onChange: function() {
		this.setState({ cme: Store.getState().cme.status });
	}
});

module.exports = HomePanel;