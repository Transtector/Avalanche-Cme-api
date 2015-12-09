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
						onChange={this._onDhcpChange}
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
		console.log("Request network change...`" + event.target.name + "`");

		var obj = {};
		if (event.target.type == 'checkbox') {
			// setting DHCP
			obj[event.target.name] = event.target.checked;

			// reset the network addresses if use DHCP - editing
			// will be disabled
			if (event.target.checked) {
				obj['address'] = this.state.address;
				obj['netmask'] = this.state.netmask;
				obj['gateway'] = this.state.gateway;
				obj['primary'] = this.state.primary;
				obj['secondary'] = this.state.secondary;
			}
		} else {
			obj[event.target.name] = event.target.value;
		}

		this.setState(obj);
	},

	_onChange: function() {
		this.setState(Store.getState().cme.config.network);
	}
});

module.exports = NetConfig;