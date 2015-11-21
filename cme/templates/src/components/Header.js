/*
 * Header.js
 * james.brunner@kaelus.com
 *
 * Cme web application header.
 *
 */

var CmeActions = require('../actions/CmeActions');

var Lvi = require('./LabelValueIndicator');

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
					<div id="model">{this.props.device.model}</div>
				</div>

				<div id="tab">&nbsp;</div>

				<div id="buttons">
					{this.props.isLoggedIn ? <button id="home" className="icon-home" onChange={this._onShowHome} /> : null}
					{this.props.isLoggedIn ? <button id="settings" className="icon-settings" onChange={this._onShowSettings} /> : null}
					{this.props.isLoggedIn ? <button id="logout" className="icon-logout" onClick={this._onLogout} />: null}
				</div>

				<div id="info">
					<Lvi item={{name: 'Serial number', value: this.props.device.serial}} />
					<Lvi item={{name: 'Firmware version', value: this.props.device.firmware}} />
				</div>

			</header>
		);
	},

	_onShowHome: function() {

	},

	_onShowSettings: function() {

	},

	_onLogout: function () {
		console.log('firing logout action...');
		CmeActions.logout();
	}
});

module.exports = Header;