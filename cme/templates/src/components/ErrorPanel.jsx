/**
 * ErrorPanel.jsx
 * james.brunner@kaelus.com
 *
 * Show errors and allow user to dismiss (clear) them.
 */
'use strict';

var React = require('react');

var Actions = require('../Actions');

var ErrorPanel = React.createClass({

	render: function() {
		if (this.props.errors && this.props.errors.length > 0) {

			return (
				<div id="error" className="panel">
					<div className="popup">
						<div className="title">Error</div>
						
						<ul className="errors">
							{this.props.errors.map(function(err, i) { 
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

	_onClearErrors: function() {
		Actions.clearErrors();
	}
});

module.exports = ErrorPanel;