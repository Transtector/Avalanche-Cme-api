/*
 * Header.jsx
 * james.brunner@kaelus.com
 *
 * Cme web application header.
 *
 */

var React = require('react');

var Constants = require('../Constants');
var Actions = require('../Actions');
var Store = require('../Store');

var Indicator = React.createClass({

	render: function () {
		return (
			<div>
				<label>
					<span>{this.props.item.name}</span>
					<span className='separator'>:</span>
				</label>
				<span>{this.props.item.value}</span>
			</div>
		);
	}
});

var Header = React.createClass({

	getInitialState: function () {
		var cmeState = Store.getState();

		return {
			device: cmeState.device,
			isLoggedIn: cmeState.isLoggedIn
		}

	},

	componentDidMount: function() {
		Store.addChangeListener(Constants.SESSION, this._onSessionChange);
		Store.addChangeListener(Constants.DEVICE, this._onDeviceChange);
	},

	componentWillUnmount: function() {
		Store.removeChangeListener(Constants.SESSION, this._onSessionChange);
		Store.removeChangeListener(Constants.DEVICE, this._onDeviceChange);
	},

	render: function () {
		
		return (
			<header>
				{this.state.device.recovery ? <div id="recovery">RECOVERY MODE</div> : null}
				
				<div id="branding">
					<div id="title">CME</div>
					<div id="model">{this.state.device.modelNumber}</div>
				</div>

				<div id="tab">&nbsp;</div>

				<div id="buttons">
					{this.state.isLoggedIn ? <button className="btn icon-home" onClick={this._showHome} /> : null}
					{this.state.isLoggedIn ? <button className="btn icon-settings" onClick={this._showSettings} /> : null}
					{this.state.isLoggedIn ? <button className="btn icon-logout" onClick={this._logout} /> : null}
				</div>

				<div id="info">
					<Indicator item={{name: 'Serial number', value: this.state.device.serialNumber}} />
					<Indicator item={{name: 'Firmware', value: this.state.device.firmware}} />
				</div>

			</header>
		);
	},

	_onSessionChange: function() {
		console.log("Header got onSessionChange event");
		this.setState({ isLoggedIn: Store.getState().isLoggedIn });
	},
	_onDeviceChange: function() {
		console.log("Header got onDeviceChange event");
		this.setState({ device: Store.getState().device });
	},

	_showHome: function() {
		Actions.ui('home');
	},

	_showSettings: function() {
		Actions.ui('config');
	},

	_logout: function () {
		Actions.logout();
	}
});

module.exports = Header;