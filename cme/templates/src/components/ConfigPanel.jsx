/**
 * ConfigPanel.jsx
 * james.brunner@kaelus.com
 *
 * CME configuration components sit in this panel.
 */
var React = require('react');

var Constants = require('../Constants');
var Actions = require('../Actions');

var InputGroup = require('./InputGroup');
var TextInput = require('./TextInput');
var ClockConfig = require('./ClockConfig');
var NetConfig = require('./NetConfig');
var UserConfig = require('./UserConfig');

var utils = require('../CmeApiUtils');

var classNames = require('classnames');
var assign = require('object-assign'); // ES6 polyfill

var TempConfig = React.createClass({
	_tempPollInterval: null,
	_tempPollPeriod: 10000,

	render: function() {
		var color = 'grey',
			status = 'Unknown';

		if (this.props.temperature || this.props.temperature == 0) {
			if (this.props.temperature > this.props.config.alarmTemp) {
				color = 'red';
				status = 'Alarm';

			} else {

				if (this.props.temperature > this.props.config.warningTemp) {
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

		var display_temperature = utils.formatTemperatureDisplay(this.props.temperature, this.props.config.displayUnits, 1);
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

	_startTempPoll: function() {

		if (!this._tempPollInterval) {
			this._tempPollInterval = setInterval(Actions.temperature, this._tempPollPeriod);
		}
	},

	_stopTempPoll: function() {

		clearInterval(this._tempPollInterval);
		this._tempPollInterval = null;
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

var ConfigPanel = React.createClass({

	render: function () {
		var config = this.props.config;

		return (
			<div className="panel" id="config">
				<div className="panel-header">
					<div className="title">Configuration</div>
					<div className="subtitle">CME device settings</div>
				</div>

				<div className="panel-content">
				
					<UserConfig />

					<InputGroup id="general">
						<TextInput id="name" value={config.general.name} onChange={this._requestChange} />
						<TextInput id="description" value={config.general.description} onChange={this._requestChange} />
						<TextInput id="location" value={config.general.location} onChange={this._requestChange} />
					</InputGroup>

					<InputGroup id="support">
						<TextInput id="contact" value={config.support.contact} onChange={this._requestChange} />
						<TextInput id="email" value={config.support.email} onChange={this._requestChange} />
						<TextInput id="phone"  value={config.support.phone} onChange={this._requestChange} />
					</InputGroup>

					<NetConfig config={config.network} />
					
					<ClockConfig clock={this.props.clock} config={config.clock} />

					<TempConfig temperature={this.props.temperature} config={config.temperature} />

					<InputGroup id="snmp">
						<div className="input-group-cluster">
							<label htmlFor="mib">MIB</label>
							<a id="mib" href="#nogo">Download MIB</a>
						</div>
					</InputGroup>

					{/*  Hidden for now - doesn't really do anything..
					<InputGroup id="http">
						<TextInput id="cors" 
								   placeholder="CORS whitelist" 
								   value={config.http.corsWhitelist} />
					</InputGroup>
					*/}

					<div className="input-group">
						<button id="factory-reset"
								className='btn' 
								onClick={this._factoryReset}>
							Factory Reset
						</button>
					</div>

				</div>

			</div>
		);
	},

	_requestChange: function(e) {
		var obj = {};
		obj[e.target.name] = e.target.value;
		Actions.config(obj);
	},

	_factoryReset: function() {
		if (confirm("CME configuration will be reset to factory defaults.\n\nOk to continue?\n\n"))
			Actions.factoryReset();
	}
});

module.exports = ConfigPanel;
