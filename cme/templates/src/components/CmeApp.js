/**
 * CmeApp.js
 * james.brunner@kaelus.com
 *
 * Core monitoring engine top-level component.
 * This component operates as a "Controller-View".  It listens for changes
 * in the CmeStore and passes the new data to its children.
 */
var React = require('react');

var Header = require('./Header');
var Login = require('./Login');
// var Home = require('./Home');
// var Config = require('./Config');

var Store = require('../Store');

function displayLogin(errors, isSubmitting) {
	return (
		<Login errors={errors} isSubmitting={isSubmitting} />
	);
}

function configPanel(config) {
	console.log("config panel: ", config);
	return (
		<div className="panel" id="config">

			<div className="input-group" id="general">
				<div className="input-group-name">General</div>

				<div className="textinput">
					<label htmlFor="name">Name</label>
					<input
						type="text"
						id="name"
						placeholder="Name"
						value={config.general.name}
					/>
				</div>

				<div className="textinput">
					<label htmlFor="description">Description</label>
					<input
						type="text"
						id="description"
						placeholder="Description"
						value={config.general.description}
					/>
				</div>

				<div className="textinput">
					<label htmlFor="location">Location</label>
					<input
						type="text"
						id="location"
						placeholder="Location"
						value={config.general.location}
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
						value={config.support.contact}
					/>
				</div>

				<div className="textinput">
					<label htmlFor="email">Email</label>
					<input
						type="text"
						id="email"
						placeholder="Email"
						value={config.support.email}
					/>
				</div>

				<div className="textinput">
					<label htmlFor="phone">Phone</label>
					<input
						type="text"
						id="phone"
						placeholder="Phone"
						value={config.support.phone}
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
						value={config.network.mac}
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
						value={config.network.address}
					/>
				</div>
				<div className="textinput">
					<label htmlFor="netmask">Subnet mask</label>
					<input
						type="text"
						id="netmask"
						placeholder="Subnet mask"
						value={config.network.netmask}
					/>
				</div>
				<div className="textinput">
					<label htmlFor="gateway">Gateway</label>
					<input
						type="text"
						id="gateway"
						placeholder="Gateway"
						value={config.network.gateway}
					/>
				</div>

			</div>


		</div>
	);
}

function homePanel() {
	return (
		<div className="panel" id="home">

		</div>
	);
}

function displayConsole(configState) {
	console.log("config state: ", configState);
	return (
		<div id="console">

			{configState.isVisible
				? configPanel(configState.config)
				: homePanel()
			}

			<div className="errors">
				ERRORS HERE!
			</div>
		</div>
	);
}

var CmeApp = React.createClass({

	getInitialState: function () {
		return Store.getState();
	},

	componentDidMount: function() {
		Store.addChangeListener(this._onChange);
	},

	componentWillUnmount: function() {
		Store.removeChangeListener(this._onChange);
	},

	render: function() {
		return (
			<div>
				<Header	device={this.state.cme.device}
					isLoggedIn={this.state.isLoggedIn} />

				{!this.state.isLoggedIn
					? displayLogin(this.state.errors, this.state.isSubmitting)
					: displayConsole({ isVisible: this.state.isConfigVisible, config: this.state.cme.config })
				}
			</div>
		);
	},

	_onChange: function() {
		this.setState(Store.getState());
	}
});

module.exports = CmeApp;