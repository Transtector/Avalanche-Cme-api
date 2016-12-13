/**
 * ThresholdGauge.jsx
 * james.brunner@kaelus.com
 *
 * Channel panel readout threshold gauge component.
 */
 'use strict';

var React = require('react');

var ThresholdGauge = React.createClass({

	getInitialState: function() {
		return {
		}
	},

	componentDidMount: function() {
	},

	componentWillUnmount: function() {
	},

	render: function() {
		return null;
		
		return (
			<div className="th-gauge">
				<div className="warning"></div>
				<div className="nominal"></div>
				<div className="pointer"></div>
			</div>
		);
	}

});

module.exports = ThresholdGauge;