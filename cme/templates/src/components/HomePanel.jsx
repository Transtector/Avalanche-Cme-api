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

var ClockWidget = React.createClass({
	
	_clockPollInterval: null,
	_clockPollPeriod: 1000,

	componentDidMount: function() {
		this._startClockPoll();
	},

	componentWillUnmount: function() {
		this._stopClockPoll();
	},

	render: function () {
		var config = this.props.config,
			clock = this.props.clock,
			date, time, timeformat, 
			clockClasses = 'hidden';

		if (clock) {

			clock = utils.formatRelativeMoment(
				moment.utc(clock),
				config.displayRelativeTo,
				config.zone
			);
			
			date = clock.format("MMM D"); // hardcoded date format (for now?)

			timeformat = config.display12HourTime
				? config.displayTimeFormat12Hour
				: config.displayTimeFormat24Hour

			time = clock.format(timeformat);

			clockClasses = classNames('clock')
		}

		return (
			<div className={clockClasses}>
				<div className="date">
					{date}
				</div>
				<div className="time">
					{time}
				</div>
			</div>
		);
	},

	_startClockPoll: function() {

		if (!this._clockPollInterval) {
			this._clockPollInterval = setInterval(Actions.clock, this._clockPollPeriod);
			Actions.clock(); // kick off first request
		}
	},

	_stopClockPoll: function() {

		clearInterval(this._clockPollInterval);
		this._clockPollInterval = null;
	}
});

var ThermometerWidget = React.createClass({
	_tempPollInterval: null,
	_tempPollPeriod: 30000, // poll temperature slowly

	componentDidMount: function() {
		this._startTempPoll();
	},

	componentWillUnmount: function() {
		this._stopTempPoll();
	},

	render: function() {
		var temp_value = this.props.temperature,
			config = this.props.config,
			thermoClasses = 'hidden', display_temperature;

		if (temp_value) {
			thermoClasses = classNames({
				'thermometer': true,
				'warn': temp_value > config.warningTemp,
				'alarm': temp_value > config.alarmTemp
			});

			display_temperature = utils.formatTemperatureDisplay(temp_value, config.displayUnits, 1);
		}

		return (
			<div className={thermoClasses}>
				<div>
					{display_temperature}
				</div>
			</div>
		);

	},

	_startTempPoll: function() {

		if (!this._tempPollInterval) {
			this._tempPollInterval = setInterval(Actions.temperature, this._tempPollPeriod);
			Actions.temperature(); // kick off first one
		}
	},

	_stopTempPoll: function() {

		clearInterval(this._tempPollInterval);
		this._tempPollInterval = null;
	}
});

var HomePanel = React.createClass({

	componentDidMount: function() {
		// request hw channels update to get all available channels
		Actions.channels();
	},

	render: function() {

		return (
			<div className="panel" id="home">
				<div className="panel-header">
					<div className="title">
						Status
					</div>
					<div className="subtitle">
						CME device channels status
					</div>

					<div className='widgets'>

						<ClockWidget clock={this.props.clock} 
									 config={this.props.clockConfig} />

						<ThermometerWidget temperature={this.props.temperature}
										   config={this.props.temperatureConfig} />
					</div>
				</div>

				<div className="panel-content">
					{	
						this.props.channels.map(function(ch) {
							return <ChannelPanel key={ch.id} ch={ch} />;
						})
					}
				</div>
			</div>
		);
	}
});

module.exports = HomePanel;