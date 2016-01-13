/**
 * HomePanel.jsx
 * james.brunner@kaelus.com
 *
 * CME status indicators site in the Home panel.
 */
 'use strict';

var React = require('react');

var Constants = require('../Constants');
var Actions = require('../Actions');

var moment = require('moment');
var classNames = require('classnames');

var utils = require('../CmeApiUtils');

var ChannelPanel = require('./ChannelPanel');

var HomePanel = React.createClass({

	componentDidMount: function() {

		Actions.poll(Constants.START, Constants.STATUS);
	},

	componentWillUnmount: function() {

			Actions.poll(Constants.STOP, Constants.STATUS);
	},

	render: function () {

		var status = this.props.status, channels, 
			clock, date, time, timeformat, clockClasses = 'hidden',
			t = status.temperature_degC, 
			temperature, thermometerClasses = 'hidden',
			wigetsClasses = 'hidden';

		if (status.channels) {
			channels = status.channels.map(function(ch){
				return <ChannelPanel key={ch.id} ch={ch} />;
			});
		}

		if (status.timestamp) {

			clock = utils.formatRelativeMoment(
					moment.utc(status.timestamp),
					this.props.clock.displayRelativeTo,
					this.props.clock.zone
			);
			
			date = clock.format("MMM D"); // hardcoded date format (for now?)

			timeformat = this.props.clock.display12HourTime
				? this.props.clock.displayTimeFormat12Hour
				: this.props.clock.displayTimeFormat24Hour

			time = clock.format(timeformat);

			clockClasses = classNames({'clock': true })
		}

		if (t) {
			temperature = t.toFixed(1) + '°C';
			thermometerClasses = classNames({
				'thermometer': true,
				'warn': t > 40,
				'alarm': t > 60
			});
		}

		if (t || status.timestamp) {
			wigetsClasses = classNames('wigets');
		}


		return (
			<div className="panel" id="home">
				<div className="panel-header">
					<div className="title">
						Status
					</div>
					<div className="subtitle">
						CME device channels status
					</div>

					<div className={wigetsClasses}>
						<div className={clockClasses}>
							<div className="date">
								{date}
							</div>
							<div className="time">
								{time}
							</div>
						</div>

						<div className={thermometerClasses}>
							<div>
								{temperature}
							</div>
						</div>

					</div>
				</div>
				<div className="panel-content">
					{channels}
				</div>
			</div>
		);
	}
});

module.exports = HomePanel;