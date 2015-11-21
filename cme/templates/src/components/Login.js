/*
 * Login.js
 * james.brunner@kaelus.com
 *
 * Cme web application login component.
 *
 */

var CmeActions = require('../actions/CmeActions');

var IconTextInput = require('./IconTextInput');

var Login = React.createClass({

	getInitialState: function () {
		return {
			u: '',
			p: '',
			isSubmitting: false,
			lastAttemptFailed: false
		};
	},

	render: function () {
		return (
			<div id="login">
				<div id="welcome">Welcome</div>
				<div id="instructions">
					Please sign in with the CME username and password.
				</div>

				<IconTextInput symbol="user" id="username" placeholder="Username" value={this.state.u} />
				<IconTextInput symbol="key" id="password" placeholder="Password" value={this.state.p} />

				<button onClick={this._onLogin}>Log In</button>
			</div>
		);
	},

	_onLogin: function () {
		console.log('firing login action...');
		CmeActions.login(this.state.u, this.state.p);
	}
});

module.exports = Login;
