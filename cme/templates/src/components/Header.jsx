/*
 * Header.jsx
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
					{this.props.isLoggedIn ? <button className="btn icon-home" onClick={this._showHome} /> : null}
					{this.props.isLoggedIn ? <button className="btn icon-settings" onClick={this._showSettings} /> : null}
					{this.props.isLoggedIn ? <button className="btn icon-logout" onClick={this._logout} />: null}
				</div>

				<div id="info">
					<Indicator item={{name: 'Serial number', value: this.props.device.serialNumber}} />
					<Indicator item={{name: 'Firmware', value: this.props.device.firmware}} />
				</div>

			</header>
		);
	},

	_showHome: function() {
		Actions.showHome();
	},

	_showSettings: function() {
		Actions.showConfig();
	},

	_logout: function () {
		Actions.logout();
	}
});

module.exports = Header;