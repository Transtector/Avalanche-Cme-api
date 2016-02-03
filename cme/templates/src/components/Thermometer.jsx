/**
 * Thermometer.jsx
 * james.brunner@kaelus.com
 *
 * Display or configure temperature.
 */
 'use strict';

var React = require('react');
var Actions = require('../Actions');
var Constants = require('../Constants');
var PollingStore = require('../PollingStore');

var InputGroup = require('./InputGroup');

var moment = require('moment');
var classNames = require('classnames');
var utils = require('../CmeApiUtils');

var Thermometer = React.createClass({
	_tempPollTimeout: null,
	_tempPollStartTime: 0,
	_tempPollPeriod: 30000,

	propTypes: {
		flavor: React.PropTypes.string, // 'config' or 'widget'
		pollPeriod: React.PropTypes.number, // how fast to poll in milliseconds
		config: React.PropTypes.object.isRequired // CME temperature configuration object
	},
	
	getInitialState: function() {
		return {
			temperature: PollingStore.getState().temperature || -100
		}
	},

	getDefaultProps: function() {
		return {
			flavor: 'widget',
			pollPeriod: 30000
		}
	},

	componentDidMount: function() {
		PollingStore.addChangeListener(Constants.ChangeTypes.TEMPERATURE, this._onTempChange);

		this._tempPollPeriod = this.props.pollPeriod;

		if (this.props.flavor === 'widget')
			this._startTempPoll();
	},

	componentWillUnmount: function() {

		this._stopTempPoll();
		PollingStore.removeChangeListener(Constants.ChangeTypes.TEMPERATURE, this._onTempChange);
	},


	componentWillReceiveProps: function(nextProps) {
		if (this._tempPollStartTime) {

			var age = moment().valueOf() - this._tempPollStartTime,
				period = (age >= this._tempPollPeriod)
							? 0
							: this._tempPollPeriod - (age % this._tempPollPeriod)

			clearTimeout(this._tempPollTimeout);
			this._tempPollTimeout = null;
			this._tempPollTimeout = setTimeout(this._pollTemp, period);
		}
	},

	render: function() {
		if (this.props.flavor === 'config') {
			return this._renderAsConfig();
		} else {
			return this._renderAsWidget();
		}
	},

	_renderAsConfig:  function() {
		var color = 'grey',
			status = 'Unknown';

		if (this.state.temperature || this.state.temperature == 0) {
			if (this.state.temperature > this.props.config.alarmTemp) {
				color = 'red';
				status = 'Alarm';

			} else {

				if (this.state.temperature > this.props.config.warningTemp) {
					color = 'yellow';
					status = 'Warning';
				}
				else {
					color = 'green';
					status = 'Normal';
				}
			}
		}

		var ledClass = classNames('led', color);

		var display_temperature = utils.formatTemperatureDisplay(this.state.temperature, this.props.config.displayUnits, 1);
		var display_warning = utils.formatTemperatureDisplay(this.props.config.warningTemp, this.props.config.displayUnits, 0);
		var display_alarm = utils.formatTemperatureDisplay(this.props.config.alarmTemp, this.props.config.displayUnits, 0);

		return (
			<InputGroup id="temperature" ref="_InputGroup" onExpand={this._startTempPoll} onCollapse={this._stopTempPoll}>
				<div className="input-group-cluster">
					<label htmlFor="tempGroup">CPU Temperature</label>
					<div id="tempGroup">
						<div id="cpuTemp">
							<input type="text" disabled='disabled' value={display_temperature} readOonly />
						</div>

						<div id='status' className={ledClass}>
							<label htmlFor='status'>Status</label>
							<div className="led-wrapper">
								<div className={ledClass}></div>
								<div className="led-text">{status}</div>
							</div>
						</div>
					</div>
				</div>

				<div className="input-group-cluster">
					<label htmlFor="units">Display Units</label>
					<div id="displayUnitsGroup" className="radio-group">
						<label htmlFor="displayUnits_celsius">
							<input type="radio" 
								id="displayUnits_celsius" 
								name="displayUnits" 
								onChange={this._requestDisplayUnitsChange}
								checked={this.props.config.displayUnits === utils.TEMPERATURE_UNITS.CELSIUS} />
							Celsius
						</label>

						<label htmlFor="displayUnits_fahrenheit">
							<input type="radio" 
								id="displayUnits_fahrenheit" 
								name="displayUnits" 
								onChange={this._requestDisplayUnitsChange}
								checked={this.props.config.displayUnits === utils.TEMPERATURE_UNITS.FAHRENHEIT} />
							Fahrenheit
						</label>
					</div>
				</div>

				<div className="input-group-cluster">
					<label htmlFor="warningTemp">Warning Temperature</label>
					<input id="warningTemp" type="text" disabled='disabled' value={display_warning} readOonly />
				</div>

				<div className="input-group-cluster">
					<label htmlFor="alarmTemp">Alarm Temperature</label>
					<input id="alarmTemp" type="text" disabled='disabled' value={display_alarm} readOonly />
				</div>

			</InputGroup>
		);
	},

	_renderAsWidget: function() {
		var temp_value = this.state.temperature,
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

	_onTempChange: function() {
		this.setState({
			temperature: PollingStore.getState().temperature
		})
	},

	_pollTemp: function() {
		this._tempPollStartTime = moment().valueOf();
		Actions.temperature();
	},

	_startTempPoll: function() {
		if (!this._tempPollStartTime) {
			this._pollTemp();
		}
	},

	_stopTempPoll: function() {

		this._tempPollStartTime = 0;
		clearTimeout(this._tempPollTimeout);
		this._tempPollTimeout = null;
	},

	_requestDisplayUnitsChange: function(e) {
		var td = utils.TEMPERATURE_UNITS.CELSIUS,
			id = e.target.id.split('_')[1].toUpperCase();

		switch(id) {
			case 'CELSIUS':
				td = utils.TEMPERATURE_UNITS.CELSIUS;
				break;
			case 'FAHRENHEIT':
				td = utils.TEMPERATURE_UNITS.FAHRENHEIT;
				break;
		}

		Actions.config({ displayUnits: td });
	}
});

module.exports = Thermometer;