/*
 * Header.js
 * james.brunner@kaelus.com
 *
 * Cme web application header.
 *
 */

var React = require('react');
var Actions = require('../Actions');

var Indicator = React.createClass({

	render: function () {
		return (
			<div className="indicator">
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

	propTypes: {
		device: React.PropTypes.object.isRequired,
		isLoggedIn: React.PropTypes.bool.isRequired
	  },

	render: function () {

		return (
			<header>
				<div id="branding">
					<div id="title">CME</div>
					<div id="model">{this.props.device.modelNumber}</div>
				</div>

				<div id="tab">&nbsp;</div>

				<div id="buttons">
					{this.props.isLoggedIn ? <button id="home" className="icon-home" onChange={this._showHome} /> : null}
					{this.props.isLoggedIn ? <button id="settings" className="icon-settings" onChange={this._showSettings} /> : null}
					{this.props.isLoggedIn ? <button id="logout" className="icon-logout" onClick={this._logout} />: null}
				</div>

				<div id="info">
					<Indicator item={{name: 'Serial number', value: this.props.device.serialNumber}} />
					<Indicator item={{name: 'Firmware version', value: this.props.device.firmware}} />
				</div>

			</header>
		);
	},

	_showHome: function() {

	},

	_showSettings: function() {

	},

	_logout: function () {
		console.log('firing logout action...');
		Actions.logout();
	}
});

module.exports = Header;