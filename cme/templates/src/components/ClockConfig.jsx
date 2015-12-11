/**
 * ClockConfig.jsx
 * james.brunner@kaelus.com
 *
 * Component to group all the Cme clock configuration.
 */
var React = require('react');

var Constants = require('../Constants');
var Actions = require('../Actions');

var InputGroup = require('./InputGroup');
var TextInput = require('./TextInput');
var ZoneInput = require('./ZoneInput');

var moment = require('moment');
var Datetime = require('react-datetime');

var classNames = require('classnames');
var assign = require('object-assign'); // ES6 polyfill

var DATE_FORMAT = "YYYY-MM-DD";
var TIME_FORMAT = "HH:mm:ss";
var TIME_FORMAT_12HOUR = "h:mm:ss a"
var TIME_DISPLAY = {
	UTC: 0,
	CME_LOCAL: 1,
	LOCAL: 2
}

var _pendingUpdate = false;

var NtpStatus = React.createClass({
	propTypes: {
		id: React.PropTypes.string.isRequired,
		value: React.PropTypes.array.isRequired,
		display12Hour: React.PropTypes.bool
	},

	render: function() {
		var statusTime, statusText;

		if (this.props.value.length == 0) {
			statusTime = moment.invalid();
			statusText = '';
			statusColor = 'grey';

		} else {
			if (!this.props.value[1]) {
				statusTime = moment(this.props.value[0]);
				statusColor = 'red';
			} else {
				statusTime = moment(this.props.value[1]);
				statusColor = (this.props.value[0] == this.props.value[1])
					? 'green'
					: 'yellow';
			}
			statusText = statusTime.format(this.props.display12Hour ? TIME_FORMAT_12HOUR : TIME_FORMAT);
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

function wrapTimeFields(obj) {
	obj.current = moment.utc(obj.current);
	obj.status.forEach(function(s) {
		s = moment.utc(s);
	});
	return obj;
}

var ClockConfig = React.createClass({

	getInitialState: function () {

		return assign(wrapTimeFields(this.props.config), 
		{
			displayAs: TIME_DISPLAY.UTC,
			display12Hour: false
		});
	},

	componentWillReceiveProps: function(nextProps) {

		// We receive updated clock every time the clock poll ticks.
		// However, we only want to set our component state to new
		// values if we've requested an update and are waiting for
		// the new clock configuration.  If we haven't requested
		// to update the clock configuration only the current and
		// status fields will update from the nextProps refresh.

		var cfg = {};

		if (_pendingUpdate) {

			_pendingUpdate = false;
			cfg = wrapTimeFields(nextProps.config);			

		} else {

			// no pending clock config update - update the 
			// current time and status fields if not NTP
			if (this.state.ntp) {
				cfg = wrapTimeFields({
					current: nextProps.config.current,
					status: nextProps.config.status
				});
			}
		}

		this.setState(cfg);
	},

	componentWillUnmount: function() {
		Actions.poll(Constants.CLOCK, Constants.STOP);
	},

	render: function() {

		var time = moment(this.state.current);

		switch(this.state.displayAs) {

			case TIME_DISPLAY.CME_LOCAL:
				time.utcOffset(this.state.zone * 60);
				break;

			case TIME_DISPLAY.LOCAL:
				time.local();
				break;
		}

		return (
			<InputGroup id="clock" onExpand={this._startClockPoll} onCollapse={this._stopClockPoll}>
				<div className="input-group-cluster">
					<label htmlFor="current">Current</label>
					<div id="current">
						<Datetime 
							timeFormat={false} 
							dateFormat={DATE_FORMAT} 
							inputProps={{ disabled: this.state.ntp }} 
							onChange={this._requestDateChange} 
							value={time} />
						<Datetime 
							dateFormat={false} 
							timeFormat={this.state.display12Hour ? TIME_FORMAT_12HOUR : TIME_FORMAT} 
							inputProps={{ disabled: this.state.ntp }} 
							onChange={this._requestTimeChange} 
							value={time} 
							className="shifted" />
					</div>
				</div>

				<div className="input-group-cluster">
					<label htmlFor="zone">Time zone offset</label>
					<ZoneInput id="zone" 
						placeholder="Time zone offset" 
						onChange={this._requestZoneChange} 
						value={this.state.zone} />
				</div>

				<div className="input-group-cluster">
					<label htmlFor="displayAsGroup">Display time</label>
					<div id="displayAsGroup" className="radio-group">
						<label htmlFor="displayAs_utc">
							<input type="radio" 
								id="displayAs_utc" 
								name="displayAs" 
								onChange={this._requestDisplayAsChange}
								checked={this.state.displayAs === TIME_DISPLAY.UTC} />
							UTC
						</label>

						<label htmlFor="displayAs_cmelocal">
							<input type="radio" 
								id="displayAs_cmelocal" 
								name="displayAs" 
								onChange={this._requestDisplayAsChange}
								checked={this.state.displayAs === TIME_DISPLAY.CME_LOCAL} />
							Cme local
						</label>

						<label htmlFor="displayAs_local">
							<input type="radio" 
								id="displayAs_local" 
								name="displayAs" 
								onChange={this._requestDisplayAsChange}
								checked={this.state.displayAs === TIME_DISPLAY.LOCAL} />
							Local
						</label>

						<div>
							<label htmlFor="display_12Hour">
								<input type="checkbox"
									id="display_12Hour"
									name="display12hour"
									onChange={this._requestDisplay12HourChange}
									checked={this.state.display12Hour} />
								12-Hour
							</label>
						</div>
					</div>
				</div>

				<div className="input-group-cluster">
					<label htmlFor="ntpGroup">NTP</label>
					<div id="ntpGroup">
						<label htmlFor="ntp">
							<input
								type="checkbox"
								name="ntp"
								id="ntp"
								placeholder="NTP"
								checked={this.state.ntp}
								onChange={this._requestNtpChange}
							/>
						Use NTP
						</label>

						<NtpStatus id="status" placeholder="Status" 
							value={this.state.status}
							display12Hour={this.state.display12Hour} />

						<div id="ta-wrapper">
							<label htmlFor="servers">NTP servers</label>
							<textarea
								name="tainput"
								id="servers"
								placeholder="NTP servers"
								value={this.state.servers}
								disabled={!this.state.ntp}
								onChange={this._requestServersChange}
							/>
						</div>
					</div>
				</div>

				<div className="input-group-buttons">
					<button className='btn' onClick={this._onReset}>Reset</button>
					<button className='btn' onClick={this._onApply}>Apply</button>
				</div>
			</InputGroup>
		);
	},

	_startClockPoll: function() {
		if (this.state.ntp)
			Actions.poll(Constants.CLOCK, Constants.START);
	},

	_stopClockPoll: function() {
		Actions.poll(Constants.CLOCK, Constants.STOP);
	},

	_onApply: function() {
		console.log("[ClockConfig]._onApply");
	},

	_onReset: function() {
		this.setState(this.props.config);
	},

	_requestServersChange: function(e) {
		this.setState({ servers: e.target.value });
	},

	_requestZoneChange: function(z) {
		this.setState({ zone: z });
	},

	_requestDateChange: function(m) {
		var current = moment(m.format(DATE_FORMAT) + "T" + moment(this.state.current).format(TIME_FORMAT));
		this.setState({ current: current });
	},

	_requestTimeChange: function(m) {
		var current = moment(moment(this.state.current).format(DATE_FORMAT) + "T" + m.format(TIME_FORMAT));
		this.setState({ current: current });
	},

	_requestDisplayAsChange: function(e) {
		var td = TIME_DISPLAY.UTC,
			id = e.target.id.split('_')[1].toUpperCase();

		switch(id) {
			case 'LOCAL':
				td = TIME_DISPLAY.LOCAL;
				break;
			case 'CMELOCAL':
				td = TIME_DISPLAY.CME_LOCAL;
				break;
		}

		this.setState({ displayAs: td })
	},

	_requestDisplay12HourChange: function(e) {
		// clone current state as well to 
		// force Datetime to update
		this.setState({ 
			display12Hour: e.target.checked,
			current: moment(this.state.current)
		});
	},

	_requestNtpChange: function(event) {
		var ntp = event.target.checked;

		if (ntp) {
			// start polling for current time
			// and reset Ntp servers and status to current config
			Actions.poll(Constants.TIME, Constants.START);
			this.setState({
				ntp: true,
				status: this.props.config.status
			});
		} else {
			// stop polling for Cme time and
			// set current time to client
			Actions.poll(Constants.TIME, Constants.STOP);
			this.setState({
				ntp: false,
				status: [],
				current: moment.utc()
			})
		}
	}
});

module.exports = ClockConfig;