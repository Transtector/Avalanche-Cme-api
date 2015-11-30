/**
 * ConfigPanel.js
 * james.brunner@kaelus.com
 *
 * CME configuration components sit in this panel.
 */
var React = require('react');

var Store = require('../Store');

var ConfigPanel = React.createClass({

	getInitialState: function () {
		return { config: Store.getState().cme.config };
	},

	componentDidMount: function() {
		Store.addChangeListener(this._onChange);
	},

	componentWillUnmount: function() {
		Store.removeChangeListener(this._onChange);
	},

	render: function () {
		return (
			<div className="panel" id="config">
				<div className="title">Configuration</div>

				<div className="input-group" id="general">
					<div className="input-group-name">General</div>

					<div className="textinput">
						<label htmlFor="name">Name</label>
						<input
							type="text"
							id="name"
							placeholder="Name"
							value={this.state.config.general.name}
						/>
					</div>

					<div className="textinput">
						<label htmlFor="description">Description</label>
						<input
							type="text"
							id="description"
							placeholder="Description"
							value={this.state.config.general.description}
						/>
					</div>

					<div className="textinput">
						<label htmlFor="location">Location</label>
						<input
							type="text"
							id="location"
							placeholder="Location"
							value={this.state.config.general.location}
						/>
					</div>
				</div>

				<div className="input-group" id="support">
					<div className="input-group-name">Support</div>

					<div className="textinput">
						<label htmlFor="contact">Contact</label>
						<input
							type="text"
							id="contact"
							placeholder="Contact name"
							value={this.state.config.support.contact}
						/>
					</div>

					<div className="textinput">
						<label htmlFor="email">Email</label>
						<input
							type="text"
							id="email"
							placeholder="Email"
							value={this.state.config.support.email}
						/>
					</div>

					<div className="textinput">
						<label htmlFor="phone">Phone</label>
						<input
							type="text"
							id="phone"
							placeholder="Phone"
							value={this.state.config.support.phone}
						/>
					</div>
				</div>

				<div className="input-group" id="network">
					<div className="input-group-name">Network</div>

					<div className="textinput">
						<label htmlFor="mac">MAC</label>
						<input
							type="text"
							id="mac"
							value={this.state.config.network.mac}
						/>
					</div>

					<div className="textinput">
						<label htmlFor="dhcp">Use DHCP</label>
					</div>

					<div className="textinput">
						<label htmlFor="address">IP Address</label>
						<input
							type="text"
							id="address"
							placeholder="IP Address"
							value={this.state.config.network.address}
						/>
					</div>
					<div className="textinput">
						<label htmlFor="netmask">Subnet mask</label>
						<input
							type="text"
							id="netmask"
							placeholder="Subnet mask"
							value={this.state.config.network.netmask}
						/>
					</div>
					<div className="textinput">
						<label htmlFor="gateway">Gateway</label>
						<input
							type="text"
							id="gateway"
							placeholder="Gateway"
							value={this.state.config.network.gateway}
						/>
					</div>

				</div>

			</div>
		);
	},

	_onChange: function() {
		this.setState({ cme: Store.getState().cme.config });
	}

});

module.exports = ConfigPanel;
