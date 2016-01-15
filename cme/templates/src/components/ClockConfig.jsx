/**
 * ClockConfig.jsx
 * james.brunner@kaelus.com
 *
 * Component to group all the Cme clock configuration.
 */
 'use strict';

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

function formatPropsToState(props) {

	var state = assign({}, props);

	state.current = moment.utc(props.current);
	state.status = [];
	props.status.forEach(function(s) {
		// s _must_ conform to ISO 8601 otherwise invalid...
		var m = moment.utc(s, moment.ISO_8601);
		state.status.push(m.isValid() ? m : moment.invalid());
	});

	if (props.servers)
		state.serversCSV = props.servers.length > 0 ? props.servers.join(', ') : '';
	else
		state.serversCSV = '';

	return state;
}

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

		if (this.props.value.length == 0) {
			statusTime = moment.invalid();
			statusText = '';
			statusColor = 'grey';

		} else {
			if (!this.props.value[1]) {
				statusTime = this.props.value[0];
				statusColor = 'red';
			} else {
				statusTime = this.props.value[1];
				statusColor = (this.props.value[0] == this.props.value[1])
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

var ClockConfig = React.createClass({

	getInitialState: function () {

		return formatPropsToState(this.props.config);
	},

	componentWillReceiveProps: function(nextProps) {

		// only update our internal state with those props that
		// are different from our current props.
		var updateState = {},
			oldprops = formatPropsToState(this.props.config),
			newprops = formatPropsToState(nextProps.config);

		Object.keys(newprops).forEach(function(key){
			if (key !== 'servers' && oldprops[key] !== newprops[key]) {
				updateState[key] = newprops[key];
			}
		}, this);

		this.setState(updateState);
	},

	componentWillUnmount: function() {

		this._stopClockPoll();
	},

	render: function() {

		// Changes are pending if certain states !== props.  These are the states the user may
		// want to apply.  Other state items will always be changing (e.g., the current time and
		// ntp status).  We don't track these changes because they're read-only as far as the
		// clock is concerned.  We also don't compare the ntp servers array.  We use serversCSV
		// string internally and format and submit new servers array based on serversCSV in Apply.
		var currentProps = formatPropsToState(this.props.config);
		var changesPending = Object.keys(currentProps)
			.filter(function (key) {
				return ['current', 'servers', 'status'].indexOf(key) == -1;
			}, this)
			.some(function(key) {
				return currentProps[key] !== this.state[key];
			}, this);

		var datetime = utils.formatRelativeMoment(this.state.current, 
			this.state.displayRelativeTo, this.state.zone);

		var ntpStatusFormat = this.state.display12HourTime
								? this.state.displayTimeFormat12Hour
								: this.state.displayTimeFormat24Hour;

		return (
			<InputGroup id="clock" ref="_InputGroup" onExpand={this._startClockPoll} onCollapse={this._stopClockPoll}>
				<div className="input-group-cluster">
					<label htmlFor="current">Current</label>
					<div id="current">
						<Datetime 
							timeFormat={false} 
							dateFormat={this.state.displayDateFormat} 
							inputProps={{ disabled: this.state.ntp }} 
							onChange={this._requestDateChange} 
							value={moment(datetime)} />
						<Datetime 
							dateFormat={false} 
							timeFormat={this.state.display12HourTime 
								? this.state.displayTimeFormat12Hour 
								: this.state.displayTimeFormat24Hour} 
							inputProps={{ disabled: this.state.ntp }} 
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
								checked={this.state.displayRelativeTo === utils.TIME_DISPLAY.UTC} />
							UTC
						</label>

						<label htmlFor="displayAs_cmelocal">
							<input type="radio" 
								id="displayAs_cmelocal" 
								name="displayAs" 
								onChange={this._requestDisplayAsChange}
								checked={this.state.displayRelativeTo === utils.TIME_DISPLAY.CME_LOCAL} />
							Cme local
						</label>

						<label htmlFor="displayAs_local">
							<input type="radio" 
								id="displayAs_local" 
								name="displayAs" 
								onChange={this._requestDisplayAsChange}
								checked={this.state.displayRelativeTo === utils.TIME_DISPLAY.LOCAL} />
							Local
						</label>

						<div>
							<label htmlFor="display_12Hour">
								<input type="checkbox"
									id="display_12Hour"
									name="display12hour"
									onChange={this._requestDisplay12HourChange}
									checked={this.state.display12HourTime} />
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
							zone={this.state.zone}
							relativeTo={this.state.displayRelativeTo}
							format={ntpStatusFormat} />

						<div id="ta-wrapper">
							<label htmlFor="servers">NTP servers</label>
							<textarea
								name="tainput"
								id="servers"
								placeholder="NTP servers"
								value={this.state.serversCSV}
								disabled={!this.state.ntp}
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

	_startClockPoll: function() {
		if (this.state.ntp)
			Actions.poll(Constants.START, Constants.CLOCK);
	},

	_stopClockPoll: function() {

		Actions.poll(Constants.STOP, Constants.CLOCK);
	},

	_onApply: function() {

		// convert the serversCSV to arrays and remove the
		// property from the submitted object
		var clock = this.state;
		clock.servers = clock.serversCSV.trim() != '' 
			? clock.serversCSV.split(',').map(function(s) { return s.trim(); }) 
			: [];

		Actions.config({ clock: clock });
		this.refs['_InputGroup'].collapse();
	},

	_onReset: function() {

		this.setState(formatPropsToState(this.props.config));
	},

	_requestServersChange: function(e) {

		this.setState({ serversCSV: e.target.value });
	},

	_requestZoneChange: function(z) {

		this.setState({ zone: z });
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

		this.setState({ displayRelativeTo: td });
	},

	_requestDisplay12HourChange: function(e) {

		this.setState({ display12HourTime: e.target.checked });
	},

	_requestNtpChange: function(event) {
		var ntp = event.target.checked;

		// start polling for current time
		// and reset Ntp servers and status to current config
		this.setState({
			ntp: ntp,
			status: ntp ? this.props.config.status : [],
			current: ntp ? this.state.current : moment.utc()
		}, (ntp
			? this._startClockPoll
			: this._stopClockPoll)
		);
	}
});
window.moment = moment;

module.exports = ClockConfig;