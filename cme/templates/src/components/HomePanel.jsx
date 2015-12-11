/**
 * HomePanel.jsx
 * james.brunner@kaelus.com
 *
 * CME status indicators site in the Home panel.
 */
var React = require('react');

var Constants = require('../Constants');
var Actions = require('../Actions');

var Scb = React.createClass({
	render: function() {
		return (
			<div className="scb">{this.props.data.name + ": " + this.props.data.description}</div>
		);
	}
})

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

		var status = this.props.status,
			scbs;

		if (status.scbs) {
			scbs = status.scbs.map(function(scb){
				return <Scb key={scb.id} data={scb} />;
			});
		}

		return (
			<div className="panel" id="home">
				<div className="panel-header">
					<div className="title">
						Status
					</div>
					<div className="subtitle">
						CME device sensor control blocks
					</div>
				</div>
				<div className="panel-content scbs">
					{scbs}
				</div>
			</div>
		);
	}
});

module.exports = HomePanel;