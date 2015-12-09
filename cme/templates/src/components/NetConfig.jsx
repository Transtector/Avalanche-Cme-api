/**
 * NetConfig.jsx
 * james.brunner@kaelus.com
 *
 * Component to group the Cme network configuration.
 */
var React = require('react');

var Store = require('../Store');

var InputGroup = require('./InputGroup');
var TextInput = require('./TextInput');

var NetConfig = React.createClass({

	getInitialState: function() {
		return Store.getState().cme.config.network;
	},

	componentDidMount: function() {
		Store.addChangeListener(this._onChange);
	},

	componentWillUnmount: function() {
		Store.removeChangeListener(this._onChange);
	},

	render: function() {
		return (
			<InputGroup id="network">
				<TextInput id="mac" placeholder="MAC" value={this.state.mac} />

				<div className="input-group-cluster">
					<label htmlFor="dhcp">DHCP</label>
					<input
						type="checkbox"
						name="dhcp"
						id="dhcp"
						placeholder="DHCP"
						checked={this.state.dhcp}
						onChange={this._requestChange}
					/>
				</div>

				<TextInput id="address" placeholder="IP address" 
					value={this.state.address} onChange={this._requestChange} disabled={this.state.dhcp} />
				<TextInput id="netmask" placeholder="Subnet mask" 
					value={this.state.netmask} onChange={this._requestChange} disabled={this.state.dhcp} />
				<TextInput id="gateway" placeholder="Gateway" 
					value={this.state.gateway} onChange={this._requestChange} disabled={this.state.dhcp} />
				<TextInput id="primary"	placeholder="Primary DNS" 
					value={this.state.primary} onChange={this._requestChange} disabled={this.state.dhcp} />
				<TextInput id="secondary" placeholder="Secondary DNS" 
					value={this.state.secondary} onChange={this._requestChange} disabled={this.state.dhcp} />

				<div className="input-group-buttons">
					<button onClick={this._onReset}>Reset</button>
					<button onClick={this._onApply}>Apply</button>
				</div>
			</InputGroup>
		);
	},

	_onReset: function() {
		this.setState(Store.getState().cme.config.network);
	},

	_onApply: function() {
		console.log("[NetConfig]._onApply");
	},

	_requestChange: function(event) {
		var obj = {},
			key = event.target.name,
			value = (key === 'dhcp') 
				? event.target.checked 
				: event.target.value;

		obj[key] = value;

		// reset net addresses if DHCP checked
		if (key === 'dhcp' && obj[key]) {
			var netState = Store.getState().cme.config.network;

			obj.address = netState.address;
			obj.netmask = netState.netmask;
			obj.gateway = netState.gateway;
			obj.primary = netState.primary;
			obj.secondary = netState.secondary;
		} 

		this.setState(obj);
	},

	_onChange: function() {
		this.setState(Store.getState().cme.config.network);
	}
});

module.exports = NetConfig;