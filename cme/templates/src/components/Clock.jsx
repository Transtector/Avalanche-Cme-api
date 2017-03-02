/**
 * ClockConfig.jsx
 * james.brunner@kaelus.com
 *
 * Component to group all the Cme clock configuration.
 *
 * This component will render as either a widget (basically
 * a simple clock display) or as a configuration panel (in
 * order to update the CME clock configuration settings).
 * Pass flavor="config" to use the configuration view, the
 * default flavor if missing is flavor="widget".
 *
 * For clock configuration editing, the component stores an
 * internal copy of the clock configuration passed in on the
 * (required) config property.  Local changes are updated in
 * the UI panel, but changes are not persisted to the system
 * unless/until they are applied (see the _onApply function).
 *
 * Once system clock configuration settings are applied, they
 * are flowed down through the component hierarchy back to
 * the Clock component via the updated config prop.  At some
 * point a parent component must be listening for a CONFIG
 * update from the Store in order to pass the clock config
 * changes down to the component.
 *
 * Clock polling is handled in _onClockChange().
 *
 */
 'use strict';

var React = require('react');

var Constants = require('../Constants');
var Actions = require('../Actions');
var Store = require('../Store');

var InputGroup = require('./InputGroup');
var TextInput = require('./TextInput');
var ZoneInput = require('./ZoneInput');

var moment = require('moment');
var Datetime = require('react-datetime');

var classNames = require('classnames');
var assign = require('object-assign'); // ES6 polyfill

var utils = require('../CmeApiUtils');

var NtpStatus = React.createClass({

	propTypes: {
		id: React.PropTypes.string.isRequired,
		value: React.PropTypes.array.isRequired,
		format: React.PropTypes.string.isRequired,
		zone: React.PropTypes.number,
		relativeTo: React.PropTypes.number
	},

	getDefaultProps: function () {
    	return { 
    		relativeTo: utils.TIME_DISPLAY.UTC,
    		zone: 0
    	};
  	},

	render: function() {
		var statusTime, statusColor, statusText;

		// props.value is the /api/config/clock/status result.
		// Generally this is an array of 2 Moments:
		// [ <last_poll_time>, <last_success_time> ]

		// if the value array is empty just leave the indicator grey
		if (this.props.value.length == 0) {
			statusTime = moment.invalid();
			statusText = '';
			statusColor = 'grey';

		// else we've at least polled (value[0]) check the value times...
		} else {

			// if we DON'T have a successful poll give red indicator
			if (!this.props.value[1]) {
				statusTime = this.props.value[0];
				statusColor = 'red';
			} else {
				statusTime = this.props.value[1];
				statusColor = (this.props.value[0].isSame(this.props.value[1]))
					? 'green'
					: 'yellow';
			}
			statusTime = utils.formatRelativeMoment(statusTime, this.props.relativeTo, this.props.zone);
			statusText = statusTime.format(this.props.format);
		}

		var ledClass = classNames('led', statusColor);

		return (
			<div id={this.props.id} className={this.props.className}>
				<label htmlFor={this.props.id}>{this.props.placeholder}</label>
				<div className="led-wrapper">
					<div className={ledClass}></div>
					<div className="led-text">
						{statusText}
					</div>
				</div>
			</div>
		);
	}
});

var formatServersCSV = function (servers) {
	return (servers && servers.length > 0)
			? servers.join(', ')
			: '';
}

var configPropToState = function (config) {

	if (!config) return;

	var state = assign({}, config);

	// add a serversCSV for editing the NTP servers
	// in the clock configuration
	state.serversCSV = formatServersCSV(config.servers);

	// force the NTP status entries to conform to
	// ISO 8601
	state.status = []
	config.status.forEach(function(s, i) {
		// s _must_ conform to ISO 8601 otherwise invalid...
		var m = moment.utc(s, moment.ISO_8601);
		state.status.push(m.isValid() ? m : moment.invalid());
	});

	return state;
}

var Clock = React.createClass({

	_pollTimeout: null,
	_pollTime: 0,

	propTypes: {
		flavor: React.PropTypes.string, // 'config' or 'widget'
		pollPeriod: React.PropTypes.number // how fast to poll in milliseconds
	},

	getDefaultProps: function() {
		return {
			flavor: 'widget',
			pollPeriod: 1000
		}
	},

	getInitialState: function() {
		
		return { 
			clock: Store.getState().clock, // CME current date/time
			config: configPropToState(this.props.config),
			current: moment.utc()
		}
	},

	componentWillReceiveProps: function(nextProps) {

		this.setState({ config: configPropToState(nextProps.config) });
	},

	componentDidMount: function() {

		Store.addChangeListener(Constants.CLOCK, this._onClockChange);

		if (this.props.flavor === 'widget' && this.props.pollPeriod > 0)
			this._startPoll();
	},

	componentWillUnmount: function() {

		this._stopPoll();

		Store.removeChangeListener(Constants.CLOCK, this._onClockChange);
	},

	render: function() {

		if (!this.props.config) return null;

		if (this.props.flavor === 'config') {
			return this._renderAsConfig();
		} else {
			return this._renderAsWidget();
		}
	},

	_renderAsConfig: function() {

		var clock = moment.utc(this.state.clock);
		
		var config = this.state.config;

		var datetime = utils.formatRelativeMoment(config.ntp ? clock : this.state.current, 
			config.displayRelativeTo, config.zone);

		var ntpStatusFormat = config.display12HourTime
								? config.displayTimeFormat12Hour
								: config.displayTimeFormat24Hour;

		// Changes are pending only if certain state config keys don't equal current 
		// CME clock config.  We'll enable the "Apply" and "Reset" actions in this
		// case.  We have to add in the serversCSV key to check for changes with it.
		var clockConfig = configPropToState(this.props.config);

		// ignore the servers and status keys when we check if local config state
		// matches the CME clock config state.
		var changesPending = Object.keys(clockConfig)
			.filter(function (key) {
				return ['servers', 'status'].indexOf(key) == -1;
			})
			.some(function(key) {
				return clockConfig[key] !== config[key];
			});


		return (
			<InputGroup id="clock" ref="_InputGroup" onExpand={this._startPoll} onCollapse={this._stopPoll}>
				<div className="input-group-cluster">
					<label htmlFor="current">Current</label>
					<div id="current">
						<Datetime 
							timeFormat={false} 
							dateFormat={config.displayDateFormat} 
							inputProps={{ disabled: config.ntp }} 
							onChange={this._requestDateChange} 
							value={moment(datetime)} />
						<Datetime 
							dateFormat={false} 
							timeFormat={config.display12HourTime 
								? config.displayTimeFormat12Hour 
								: config.displayTimeFormat24Hour} 
							inputProps={{ disabled: config.ntp }} 
							onChange={this._requestTimeChange} 
							value={moment(datetime)} 
							className="shifted" />
					</div>
				</div>

				<div className="input-group-cluster">
					<label htmlFor="zone">Time zone offset</label>
					<ZoneInput id="zone" 
						placeholder="Time zone offset" 
						onChange={this._requestZoneChange} 
						value={config.zone} />
				</div>

				<div className="input-group-cluster">
					<label htmlFor="displayAsGroup">Display time</label>
					<div id="displayAsGroup" className="radio-group">
						<label htmlFor="displayAs_utc">
							<input type="radio" 
								id="displayAs_utc" 
								name="displayAs" 
								onChange={this._requestDisplayAsChange}
								checked={config.displayRelativeTo === utils.TIME_DISPLAY.UTC} />
							UTC
						</label>

						<label htmlFor="displayAs_cmelocal">
							<input type="radio" 
								id="displayAs_cmelocal" 
								name="displayAs" 
								onChange={this._requestDisplayAsChange}
								checked={config.displayRelativeTo === utils.TIME_DISPLAY.CME_LOCAL} />
							Cme local
						</label>

						<label htmlFor="displayAs_local">
							<input type="radio" 
								id="displayAs_local" 
								name="displayAs" 
								onChange={this._requestDisplayAsChange}
								checked={config.displayRelativeTo === utils.TIME_DISPLAY.LOCAL} />
							Local
						</label>

						<div>
							<label htmlFor="display_12Hour">
								<input type="checkbox"
									id="display_12Hour"
									name="display12hour"
									onChange={this._requestDisplay12HourChange}
									checked={config.display12HourTime} />
								12-Hour
							</label>
						</div>
					</div>
				</div>

				<div className="input-group-cluster no-border">
					<label htmlFor="ntpGroup">NTP</label>
					<div id="ntpGroup">
						<label htmlFor="ntp">
							<input
								type="checkbox"
								name="ntp"
								id="ntp"
								placeholder="NTP"
								checked={config.ntp}
								onChange={this._requestNtpChange}
							/>
						Use NTP
						</label>

						<NtpStatus id="status" placeholder="Status" 
							value={config.status}
							zone={config.zone}
							relativeTo={config.displayRelativeTo}
							format={ntpStatusFormat} />

						<div id="ta-wrapper">
							<label htmlFor="servers">NTP servers</label>
							<textarea
								name="tainput"
								id="servers"
								placeholder="NTP servers"
								value={config.serversCSV}
								disabled={!config.ntp}
								onChange={this._requestServersChange}
							/>
						</div>
					</div>
				</div>

				<div className="input-group-buttons">
					<button className='btn' 
							onClick={this._onReset}
							disabled={!changesPending}>Reset</button>
					<button className='btn' 
							onClick={this._onApply}
							disabled={!changesPending}>Apply</button>
				</div>
			</InputGroup>
		);
	},

	_renderAsWidget: function () {
		var config = this.state.config,
			clock = this.state.clock,
			date, time, timeformat, 
			clockClasses = 'hidden';

		if (clock && config) {

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

			clockClasses = classNames({
				'clock': true,
				'hidden': this.props.pollPeriod < 0
			});
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

	_onClockChange: function() {
		var _this = this;

		// Set the state and set up next clock poll
		this.setState({ clock: Store.getState().clock }, function () {

			if (!_this._pollTime || _this.props.pollPeriod < 0) return;

			var age = moment().valueOf() - _this._pollTime,
				period = _this.props.pollPeriod - (age % _this.props.pollPeriod);

			clearTimeout(_this._pollTimeout);
			_this._pollTimeout = setTimeout(_this._startPoll, period);
		});
	},

	_startPoll: function() {
		this._pollTime = moment().valueOf();
		Actions.clock();
	},

	_stopPoll: function() {
		this._pollTime = 0;
		clearTimeout(this._pollTimeout);
		this._pollTimeout = null;
	},

	_onApply: function() {

		// convert the serversCSV to arrays and remove the
		// property from the submitted object
		var config = this.state.config;
		config.servers = config.serversCSV.trim() != '' 
			? config.serversCSV.split(',').map(function(s) { return s.trim(); }) 
			: [];

		if (config.ntp) {
			delete config.current;
		}

		Actions.config({ clock: config });
		this.refs['_InputGroup'].collapse();
	},

	_onReset: function() {

		this.setState({ config: configPropToState(this.props.config) });
	},

	_requestServersChange: function(e) {

		this.setState({ config: assign(this.state.config, { serversCSV: e.target.value }) });
	},

	_requestZoneChange: function(z) {

		this.setState({ config: assign(this.state.config, { zone: z }) });
	},

	_requestDateChange: function(m) {
		var newdate = m.utc().utcOffset(0);
		var currenttime = this.state.current.utc().utcOffset(0);
		var current = moment(newdate.format("YYYY-MM-DD") + "T" + currenttime.format("HH:mm:ssZ"));

		this.setState({ current: current });
	},

	_requestTimeChange: function(m) {
		var currentdate = this.state.current.utc().utcOffset(0);
		var newtime = m.utc().utcOffset(0);
		var current = moment(currentdate.format("YYYY-MM-DD") + "T" + newtime.format("HH:mm:ssZ"));
		
		this.setState({ current: current });
	},

	_requestDisplayAsChange: function(e) {
		var td = utils.TIME_DISPLAY.UTC,
			id = e.target.id.split('_')[1].toUpperCase();

		switch(id) {
			case 'LOCAL':
				td = utils.TIME_DISPLAY.LOCAL;
				break;
			case 'CMELOCAL':
				td = utils.TIME_DISPLAY.CME_LOCAL;
				break;
		}

		this.setState({ config: assign(this.state.config, { displayRelativeTo: td }) });
	},

	_requestDisplay12HourChange: function(e) {

		this.setState({ config: assign(this.state.config, { display12HourTime: e.target.checked }) });
	},

	_requestNtpChange: function(event) {
		var ntp = event.target.checked;

		// start polling for current time
		// and reset Ntp servers and status to current config
		this.setState({ 
			current: ntp ? this.state.current : moment.utc(),
			config: assign(this.state.config, {
				ntp: ntp,
				status: ntp ? this.state.config.status : []
			})},
			(ntp ? this._startPoll : this._stopPoll));
	}
});

module.exports = Clock;
