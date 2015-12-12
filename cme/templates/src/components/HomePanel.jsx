/**
 * HomePanel.jsx
 * james.brunner@kaelus.com
 *
 * CME status indicators site in the Home panel.
 */
var React = require('react');

var Constants = require('../Constants');
var Actions = require('../Actions');

var moment = require('moment');

var Scb = React.createClass({
	render: function() {
		return (
			<div className="scb">
				<div className="scb-header">
					{this.props.data.name + ": " + this.props.data.description}
				</div>
	
				<div className="scb-primary">
					<div className="sensor-value">
						{this.props.data.sensors[0].value}
					</div>
					<div className="sensor-unit">
						{this.props.data.sensors[0].unit}
					</div>
				</div>

				<div className="scb-secondary">
					<div className="sensor-value">
						{this.props.data.sensors[1].value}
					</div>
					<div className="sensor-unit">
						{this.props.data.sensors[1].unit}
					</div>
				</div>


				<div className="scb-controls">

				</div>

				<button className="btn scb-history-badge">
					42 days
				</button>

			</div>
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
			scbs, clock, date, time;

		if (status.scbs) {
			scbs = status.scbs.map(function(scb){
				return <Scb key={scb.id} data={scb} />;
			});
		}

		if (status.timestamp) {
			clock = moment.utc(status.timestamp);
			date = clock.format("M/D");
			time = clock.format("h:mm:ss A");
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

					<div className="clock">
						<div className="date">
							{date}
						</div>
						<div className="time">
							{time}
						</div>
					</div>
				</div>
				<div className="panel-content">
					{scbs}
				</div>
			</div>
		);
	}
});

module.exports = HomePanel;