/**
 * HomePanel.jsx
 * james.brunner@kaelus.com
 *
 * CME status indicators site in the Home panel.
 */
var React = require('react');

var Constants = require('../Constants');
var Actions = require('../Actions');

var HomePanel = React.createClass({

	getInitialState: function () {
		return {}
	},

	componentDidMount: function() {
		Actions.poll(Constants.STATUS, Constants.START);
	},

	componentWillUnmount: function() {
		Actions.poll(Constants.STATUS, Constants.STOP);
	},

	render: function () {

		var sensorControlBlocks,
			status = this.props.status;

		if (status.scb) {
			sensorControlBlocks = status.scb.map(function(s){
				return (
					<li key={s.id}>{s.id}</li>
				);
			});
		}

		return (
			<div className="panel" id="home">
				<div className="title">Status</div>
				<ul>
					{sensorControlBlocks}
				</ul>
			</div>
		);
	}
});

module.exports = HomePanel;