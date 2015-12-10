/**
 * ErrorPanel.jsx
 * james.brunner@kaelus.com
 *
 * Show errors and allow user to dismiss them.
 *
 */

var React = require('react');

var ErrorPanel = React.createClass({

	render: function() {
		if (this.props.errors && this.props.errors.length > 0) {
			return (
				<div className="panel" id="error">
					<div className="message">
						ERRORS SHOWN HERE
					</div>
				</div>
			)
		}
		return null;
	}
});

module.exports = ErrorPanel;