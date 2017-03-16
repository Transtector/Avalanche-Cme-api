/*
 * Login.jsx
 * james.brunner@kaelus.com
 *
 * Cme web application login component.
 *
 */
'use strict';

var React = require('react');

var Constants = require('../Constants');
var Actions = require('../Actions');
var Store = require('../Store');

var classNames = require('classnames');
var key = require('../keymaster/keymaster.js');

var Login = React.createClass({

	getInitialState: function () {
		var cmeState = Store.getState();
		return {
			isLoggedIn: cmeState.isLoggedIn,
			errors: cmeState.errors,
			u: '',
			p: '',
			isValid: false
		};
	},

	componentDidMount: function() {
		Store.addChangeListener(Constants.SESSION, this._onSessionChange);
		Store.addChangeListener(Constants.ERROR, this._onErrorChange);

		key('enter', this._login);
		key.filter = function filter(event){
 			var tagName = (event.target || event.srcElement).tagName;
			return !(tagName == 'SELECT' || tagName == 'TEXTAREA');
		}

	},

	componentWillUnmount: function() {
		key.unbind('enter');

		Store.removeChangeListener(Constants.SESSION, this._onSessionChange);
		Store.removeChangeListener(Constants.ERROR, this._onErrorChange);
	},

	render: function () {

		if (this.state.isLoggedIn)
			return null;

		// show login errors for a few seconds
		if (this.state.errors.length > 0)
			setTimeout(Actions.clearErrors, 3000);
		
		var cn = classNames('login-error', {'isVisible': this.state.errors.length > 0});

		return (
			<div className='panel' id='login'>
				<div id="welcome">Welcome</div>

				<div id="instructions">
					Please sign in with the CME username and password.

					<div className={cn}>
						{this.state.errors.map(function(err){ return err.source; })}&nbsp;
					</div>
				</div>

				<div className="icontextinput icon-user">
					<input
						id="username"
						placeholder="Username"
						onChange={this._onChangeUsername}
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
						value={this.state.p}
					/>
				</div>

				<button
					className='btn'
					disabled={!this.state.isValid}
					onClick={this._login}>
					Sign In
				</button>
			</div>
		);
	},

	_onSessionChange: function() {

		this.setState({ isLoggedIn: Store.getState().isLoggedIn })
	},

	_onErrorChange: function() {

		this.setState({ errors: Store.getState().errors })
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

	_login: function(e) {

		if (!this.state.isValid) return false;

		Actions.clearErrors();
		Actions.login(this.state.u, this.state.p);
		e.preventDefault();
		return false;
	}
});

module.exports = Login;
