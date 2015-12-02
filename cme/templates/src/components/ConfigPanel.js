/**
 * ConfigPanel.js
 * james.brunner@kaelus.com
 *
 * CME configuration components sit in this panel.
 */
var React = require('react');

var Constants = require('../Constants');
var Actions = require('../Actions');
var Store = require('../Store');

var TextInput = require('./TextInput');
var CheckboxInput = require('./CheckboxInput');

var classNames = require('classnames');
var assign = require('object-assign'); // ES6 polyfill

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

var ConfigPanel = React.createClass({

	getInitialState: function () {
		var config = Store.getState().cme.config,
			net = assign({}, config.network, {	test: 1, foot: 2 });
		return {
			config: config,
			net: net
		};
	},

	componentDidMount: function() {
		Store.addChangeListener(this._onChange);
		Actions.pollTime(Constants.START);
	},

	componentWillUnmount: function() {
		Store.removeChangeListener(this._onChange);
		Actions.pollTime(Constants.STOP);
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
					<CheckboxInput id="dhcp" placeholder="DHCP" checked={this.state.net.dhcp} onChange={this._onNetChange} />
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

				<InputGroup id="time">
					<TextInput id="current" value={this.state.config.time.current} onChange={this._onUpdate} disabled={this.state.config.time.ntp} />
					<TextInput id="zone" placeholder="Zone offset" value={this.state.config.time.zone} />
					<CheckboxInput id="ntp" placeholder="NTP" checked={this.state.config.time.ntp} />
					<TextInput id="servers" placeholder="NTP servers" value={this.state.config.time.servers} disabled={!this.state.config.time.ntp} />
					<TextInput id="status" placeholder="NTP status" value={this.state.config.time.status} />
				</InputGroup>

				<InputGroup id="snmp">
					<div className="linkinput">
						<label htmlFor="mib">MIB</label>
						<a id="mib" href="">Download MIB</a>
					</div>
				</InputGroup>

				<InputGroup id="http">
					<TextInput id="cors" placeholder="CORS whitelist" value={this.state.config.http.corsWhitelist} />
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

	_onNetReset: function(event) {
		this.setState({ net: assign({}, this.state.net, Store.getState().cme.config.network) });
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
		this.setState({ config: Store.getState().cme.config });
	}
});

module.exports = ConfigPanel;
