/**
 * ErrorPanel.jsx
 * james.brunner@kaelus.com
 *
 * Show errors and allow user to dismiss (clear) them.
 */
'use strict';

var React = require('react');

var Constants = require('../Constants');
var Actions = require('../Actions');
var Store = require('../Store');

var ErrorPanel = React.createClass({
	
	getInitialState: function () {
		var cmeState = Store.getState();
		return {
			isLoggedIn: cmeState.isLoggedIn,
			errors: cmeState.errors
		};
	},

	componentDidMount: function() {
		Store.addChangeListener(Constants.SESSION, this._onSessionChange);
		Store.addChangeListener(Constants.ERROR, this._onErrorChange);
	},

	componentWillUnmount: function() {
		Store.removeChangeListener(Constants.SESSION, this._onSessionChange);
		Store.removeChangeListener(Constants.ERROR, this._onErrorChange);
	},

	render: function() {

		if (this.state.isLoggedIn && this.state.errors && this.state.errors.length > 0) {

			return (
				<div id="error" className="panel">
					<div className="popup">
						<div className="title">Error</div>
						
						<ul className="errors">
							{this.state.errors.map(function(err, i) { 
								var msg = err.source + ' [' + err.code + ']';
								return (
									<li key={i + 1}>{msg}</li>
								)}
							)}
						</ul>

						<div className="buttons">
							<button className='btn' onClick={this._onClearErrors}>Ok</button>
						</div>
					</div>
				</div>
			)
		}

		return null;
	},
	
	_onSessionChange: function() {
		this.setState({ isLoggedIn: Store.getState().isLoggedIn })
	},

	_onErrorChange: function() {
		var newErrors = Store.getState().errors;
		var clearingErrors = !newErrors || newErrors.length == 0 && this.state.errors && this.state.errors.length > 0;

		this.setState({ errors: newErrors });

		// refresh page if clearing errors
		if (clearingErrors) setTimeout(function () { location.reload(); }, 10);
	},	

	_onClearErrors: function() {
		Actions.clearErrors();
	}
});

module.exports = ErrorPanel;