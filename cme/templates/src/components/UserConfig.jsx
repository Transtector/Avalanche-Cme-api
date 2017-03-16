/**
 * UserConfig.jsx
 * james.brunner@kaelus.com
 *
 * Component to group CME user configuration - username/password
 */
 'use strict';

var React = require('react');

var Constants = require('../Constants');
var Actions = require('../Actions');

var InputGroup = require('./InputGroup');
var TextInput = require('./TextInput');

var classNames = require('classnames');
var assign = require('object-assign'); // ES6 polyfill


var UserConfig = React.createClass({

	getInitialState: function () {

		return { u: '', p: '', pc: '' };
	},

	render: function() {
		var placeholder = "Empty to leave unchanged",
			changesPending = this.state.u || this.state.p || this.state.pc,
			valid = this.state.p === this.state.pc && (this.state.p.length == 0 || this.state.p.length >= 4);

		return (
			<InputGroup title="Login Profile" ref="_InputGroup">

				{/* These hidden inputs are to stop Chrome from autofilling the username and password fields.
					See: http://stackoverflow.com/questions/12374442/chrome-browser-ignoring-autocomplete-off	*/}
				<input style={{display:'none'}} />
				<input type="password" style={{display:'none'}} />

				<TextInput id="u" name="Username"
						   placeholder={placeholder}
						   defaultValue={this.state.u} 
						   onBlur={this._inputChange} />

				<TextInput id="p" name="Password"
						   type="password"
						   placeholder={placeholder}
						   defaultValue={this.state.p} 
						   onBlur={this._inputChange} />

				<TextInput id="pc" name="Re-enter password"
						   type="password"
						   className='no-border'
						   placeholder="Must match password"
						   defaultValue={this.state.pc} 
						   onBlur={this._inputChange} />

				<div className="input-group-buttons">
					<button className='btn full-width' 
							onClick={this._onApply}
							disabled={!changesPending || !valid}>Apply</button>
				</div>
			</InputGroup>
		);
	},

	_onApply: function() {
		var self = this;
		Actions.profile(this.state.u, this.state.p, function() {
			 alert("CME user profile updated.");
			 self.setState({ u: '', p: '', pc: '' });
			 self.refs['_InputGroup'].collapse();
		});
	},

	_inputChange: function(e) {
		var obj = {};

		obj[e.target.id] = e.target.value.trim();
		this.setState(obj);
	}
});

module.exports = UserConfig;