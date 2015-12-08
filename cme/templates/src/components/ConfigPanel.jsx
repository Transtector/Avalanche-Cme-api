/**
 * ConfigPanel.jsx
 * james.brunner@kaelus.com
 *
 * CME configuration components sit in this panel.
 */
var React = require('react');

var Constants = require('../Constants');
var Actions = require('../Actions');
var Store = require('../Store');

var TextInput = require('./TextInput');
var ZoneInput = require('./ZoneInput');

var moment = require('moment');
var Datetime = require('react-datetime');

var classNames = require('classnames');
var assign = require('object-assign'); // ES6 polyfill

var DATE_FORMAT = "YYYY-MM-DD";
var TIME_FORMAT = "HH:mm:ss";

var TIME_DISPLAY = {
	UTC: 0,
	CME_LOCAL: 1,
	LOCAL: 2
}

var InputGroup = React.createClass({

	propTypes: {
		id: React.PropTypes.string.isRequired
	},

	getInitialState: function () {
		return {
			collapsed: true
		}
	},

	render: function() {
		var capitalizedId = this.props.id.charAt(0).toUpperCase() + this.props.id.slice(1);
		var cn = classNames({'input-group': true, 'collapsed': this.state.collapsed});
		return (
			<div className={cn} id={this.props.id}>
				<div className="input-group-title">
					<button onClick={this._onClick} />
					{capitalizedId}
				</div>
				<div className="input-group-content">
					{this.props.children}
				</div>
			</div>
		);
	},

	_onClick: function() {
		this.setState({ collapsed: !this.state.collapsed });
	}
});

var NtpStatus = React.createClass({
	propTypes: {
		id: React.PropTypes.string.isRequired,
		value: React.PropTypes.array.isRequired
	},

	render: function() {
		var cn = classNames('input-group-cluster', this.props.className),
			statusTime, statusText;

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
			statusText = statusTime.format(TIME_FORMAT);
		}

		var ledClass = classNames('led', statusColor);


		return (
			<div id={this.props.id} className={cn}>
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


function getNtpDisplay(objTime) {
	var ntpDisplay = {};

	ntpDisplay.current = moment(objTime.current);
	ntpDisplay.zone = objTime.zone;
	ntpDisplay.ntp = objTime.ntp;
	ntpDisplay.servers = objTime.servers;
	ntpDisplay.status = objTime.status;

	return ntpDisplay;
}

var ConfigPanel = React.createClass({

	getInitialState: function () {

		var config = Store.getState().cme.config;

		return {
			config: config,
			net: assign({}, config.network, {	test: 1, foot: 2 }),
			timeDisplay: TIME_DISPLAY.UTC,
			ntpDisplay: getNtpDisplay(config.time)
		};
	},

	componentDidMount: function() {
		Store.addChangeListener(this._onChange);

		// start time poll if ntp set initially
		if (this.state.ntpDisplay.ntp)
			Actions.poll(Constants.TIME, Constants.START);
	},

	componentWillUnmount: function() {
		Store.removeChangeListener(this._onChange);
		Actions.poll(Constants.TIME, Constants.STOP);
	},

	render: function () {
		return (
			<div className="panel" id="config">
				<div className="title">Configuration</div>

				<InputGroup id="general">
					<TextInput id="name" value={this.state.config.general.name} onChange={this._onUpdate} />
					<TextInput id="description" value={this.state.config.general.description} onChange={this._onUpdate} />
					<TextInput id="location" value={this.state.config.general.location} onChange={this._onUpdate} />
				</InputGroup>

				<InputGroup id="support">
					<TextInput id="contact" value={this.state.config.support.contact} onChange={this._onUpdate} />
					<TextInput id="email" value={this.state.config.support.email} onChange={this._onUpdate} />
					<TextInput id="phone"  value={this.state.config.support.phone} onChange={this._onUpdate} />
				</InputGroup>

				<InputGroup id="network">
					<TextInput id="mac" placeholder="MAC" value={this.state.config.network.mac} />

					<div className="input-group-cluster">
						<label htmlFor="dhcp">DHCP</label>
						<input
							type="checkbox"
							name="dhcp"
							id="dhcp"
							placeholder="DHCP"
							checked={this.state.net.dhcp}
							onChange={this._onNetChange}
						/>
					</div>

					<TextInput id="address" placeholder="IP address" value={this.state.net.address} onChange={this._onNetChange} disabled={this.state.net.dhcp} />
					<TextInput id="netmask" placeholder="Subnet mask" value={this.state.net.netmask} onChange={this._onNetChange} disabled={this.state.net.dhcp} />
					<TextInput id="gateway" value={this.state.net.gateway} onChange={this._onNetChange} disabled={this.state.net.dhcp} />
					<TextInput id="primary"	placeholder="Primary DNS" value={this.state.net.primary} onChange={this._onNetChange} disabled={this.state.net.dhcp} />
					<TextInput id="secondary" placeholder="Secondary DNS" value={this.state.net.secondary} onChange={this._onNetChange} disabled={this.state.net.dhcp} />
					<div className="input-group-buttons">
						<button onClick={this._onNetReset}>Reset</button>
						<button>Apply</button>
					</div>
				</InputGroup>

				<InputGroup id="clock">
					<div className="input-group-cluster">
						<label htmlFor="current">Current</label>
						<div id="current">
							<Datetime timeFormat={false} dateFormat={DATE_FORMAT} inputProps={{ disabled: this.state.ntpDisplay.ntp }} onChange={this._onDateChange} value={this.state.ntpDisplay.current} />
							<Datetime className="shifted" dateFormat={false} timeFormat={TIME_FORMAT} inputProps={{ disabled: this.state.ntpDisplay.ntp }} onChange={this._onTimeChange} value={this.state.ntpDisplay.current} />
						</div>
					</div>

					<div className="input-group-cluster">
						<label htmlFor="timeDisplayGroup">Display time</label>
						<div id="timeDisplayGroup" className="radio-group">
							<label htmlFor="timeDisplay_utc">
								<input type="radio" 
									id="timeDisplay_utc" 
									name="timeDisplay" 
									onChange={this._onDisplayTimeChange}
									checked={this.state.timeDisplay === TIME_DISPLAY.UTC} />
								UTC
							</label>

							<label htmlFor="timeDisplay_cmelocal">
								<input type="radio" 
									id="timeDisplay_cmelocal" 
									name="timeDisplay" 
									onChange={this._onDisplayTimeChange}
									checked={this.state.timeDisplay === TIME_DISPLAY.CME_LOCAL} />
								Cme local
							</label>

							<label htmlFor="timeDisplay_local">
								<input type="radio" 
									id="timeDisplay_local" 
									name="timeDisplay" 
									onChange={this._onDisplayTimeChange}
									checked={this.state.timeDisplay === TIME_DISPLAY.LOCAL} />
								Local
							</label>
						</div>
					</div>

					<div className="input-group-cluster">
						<label htmlFor="zone">Time zone offset</label>
						<ZoneInput id="zone" 
							placeholder="Time zone offset" 
							onChange={this._onZoneChange} 
							value={this.state.ntpDisplay.zone} />
					</div>

					<div className="input-group-cluster">
						<label htmlFor="ntp">NTP</label>
						<input
							type="checkbox"
							name="ntp"
							id="ntp"
							placeholder="NTP"
							checked={this.state.ntpDisplay.ntp}
							onChange={this._onUseNtpChange}
						/>
					</div>

					<div className="input-group-cluster">
						<label htmlFor="servers">NTP servers</label>
						<textarea
							name="tainput"
							id="servers"
							placeholder="NTP servers"
							value={this.state.ntpDisplay.servers}
							disabled={!this.state.ntpDisplay.ntp}
							onChange={this._onNtpServersChange}
						/>
					</div>

					<NtpStatus id="status" placeholder="NTP status" value={this.state.ntpDisplay.status} />

					<div className="input-group-buttons">
						<button onClick={this._onNtpReset}>Reset</button>
						<button>Apply</button>
					</div>
				</InputGroup>

				<InputGroup id="snmp">
					<div className="input-group-cluster">
						<label htmlFor="mib">MIB</label>
						<a id="mib" href="#nogo">Download MIB</a>
					</div>
				</InputGroup>

				<InputGroup id="http">
					<TextInput id="cors" 
						placeholder="CORS whitelist" 
						value={this.state.config.http.corsWhitelist} />
				</InputGroup>

			</div>
		);
	},

	_onUpdate: function(event) {
		var name = event.target.name,
			value = event.target.value,
			obj = {};
		obj[name] = value;
		Actions.config(obj);
	},

	_onNtpReset: function(event) {
		this.setState({ ntpDisplay: getNtpDisplay(this.state.config.time) });
	},

	_onNtpServersChange: function(event) {
		var newservers = event.target.value,
			obj = this.state.ntpDisplay;

		obj.servers = newservers;

		this.setState({ ntpDisplay: obj });
	},

	_onZoneChange: function(z) {
		var obj = this.state.ntpDisplay;
		obj.zone = z;

		this.setState({ ntpDisplay: obj });
	},

	_onDateChange: function(m) {
		console.log("[onDateChange, m = ", m.format());

		var obj = this.state.ntpDisplay;
		obj.current = moment(m.format(DATE_FORMAT) + "T" + moment(obj.current).format(TIME_FORMAT));

		this.setState({ ntpDisplay: obj });
	},

	_onTimeChange: function(m) {
		console.log("[onTimeChange, m = ", m.format());

		var obj = this.state.ntpDisplay;
		obj.current = moment(moment(obj.current).format(DATE_FORMAT) + "T" + m.format(TIME_FORMAT));

		this.setState({ ntpDisplay: obj });
	},

	_onDisplayTimeChange: function(e) {
		console.log("[_onDisplayTimeChange] id = ", e.target.id);
	},

	_onUseNtpChange: function(event) {
		var obj = this.state.ntpDisplay,
			useNtp = event.target.checked;

		// setting useNtp?
		obj['ntp'] = useNtp;

		if (useNtp) {
			// start polling for current time
			// and reset Ntp servers and status to current config
			Actions.poll(Constants.TIME, Constants.START);
			obj['status'] = this.state.config.time.status;
		} else {
			// stop polling for Cme time and
			// set current time to client
			Actions.poll(Constants.TIME, Constants.STOP);
			obj['current'] = moment();
			obj['status'] = [];
		}

		this.setState({ ntpDisplay: obj });
	},

	_onNetReset: function(event) {
		this.setState({ 
			net: assign({}, this.state.net, Store.getState().cme.config.network) 
		});
	},

	_onNetChange: function(event) {
		console.log("Update pending network...`" + event.target.name + "`");

		var obj = {};
		if (event.target.type == 'checkbox') {
			// setting DHCP
			obj[event.target.name] = event.target.checked;

			// reset the network addresses if use DHCP - editing
			// will be disabled
			if (event.target.checked) {
				obj['address'] = this.state.config.network.address;
				obj['netmask'] = this.state.config.network.netmask;
				obj['gateway'] = this.state.config.network.gateway;
				obj['primary'] = this.state.config.network.primary;
				obj['secondary'] = this.state.config.network.secondary;
			}
		} else {
			obj[event.target.name] = event.target.value;
		}

		var newnet = assign(this.state.net, obj);
		this.setState({ net: newnet });
	},

	_onChange: function() {
		// store data updated - read new config
		var config = Store.getState().cme.config;

		// update the local copy of the time if NTP
		if (this.state.ntpDisplay.ntp) {
			this.state.ntpDisplay.current = moment(config.time.current);
		}

		this.setState({
			config: config,
			ntpDisplay: this.state.ntpDisplay
		});
	}
});

module.exports = ConfigPanel;
