/*
 * Login.jsx
 * james.brunner@kaelus.com
 *
 * Cme web application login component.
 *
 */
'use strict';

var React = require('react');

var Actions = require('../Actions');

var classNames = require('classnames');

var ENTER_KEY_CODE = 13;

var Login = React.createClass({

	propTypes: {
		errors: React.PropTypes.array.isRequired,
		isSubmitting: React.PropTypes.bool.isRequired
	},

	getInitialState: function () {
		return {
			u: '',
			p: '',
			isValid: false
		};
	},

	render: function () {
		if (this.props.errors.length > 0)
			setTimeout(Actions.clearErrors, 3000);
		
		var cn = classNames('login-error', {'isVisible': this.props.errors.length > 0});

		return (
			<div id="login">
				<div id="welcome">Welcome</div>

				<div id="instructions">
					Please sign in with the CME username and password.

					<div className={cn}>
						{this.props.errors.map(function(err){ return err.source; })}&nbsp;
					</div>
				</div>

				<div className="icontextinput icon-user">
					<input
						id="username"
						placeholder="Username"
						onChange={this._onChangeUsername}
						onKeydown={this._onKeyDown}
						value={this.state.u}
						autoFocus={true}
					/>
				</div>

				<div className="icontextinput icon-key">
					<input
						type="password"
						id="password"
						placeholder="Password"
						onChange={this._onChangePassword}
						onKeyDown={this._onKeyDown}
						value={this.state.p}
					/>
				</div>

				<button
					className='btn'
					disabled={!this.state.isValid}
					onClick={this._onLogin}>
					Sign In
				</button>
			</div>
		);
	},

	_onChangeUsername: function(event) {
		var u = event.target.value,
			v = u && this.state.p;
		this.setState({ u: u, isValid: v });
	},

	_onChangePassword: function(event) {
		var p = event.target.value,
			v = p && this.state.u;
		this.setState({ p: p, isValid: v });
	},

	_onKeyDown: function(event) {
		if (event.keyCode === ENTER_KEY_CODE && this.state.isValid) {
			this._onLogin();
	    }
	},

	_onLogin: function() {
		Actions.clearErrors();
		Actions.login(this.state.u, this.state.p);
	}
});

module.exports = Login;
