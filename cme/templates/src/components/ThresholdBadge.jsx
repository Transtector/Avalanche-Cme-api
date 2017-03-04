/**
 * ThresholdBadge.jsx
 * james.brunner@kaelus.com
 *
 * Channel panel readout threshold badge component.
 */
 'use strict';
var React = require('react');

var classNames = require('classnames');

var ThresholdBadge = React.createClass({

	getInitialState: function() {
		return {}
	},

	render: function() {
		if (!this.props.sensor) return null; // no sensor
		if (!this.props.sensor.thresholds || this.props.sensor.thresholds.length == 0) return null; // no thresholds
		if (!this.props.sensor.value) return null; // no value

		var t = this.props.sensor.thresholds;
		var value = this.props.sensor.value;

		function filter_thresholds(th) {
			if (th.direction.toUpperCase() == this[0].toUpperCase() && 
				th.classification.toUpperCase() == this[1].toUpperCase()) {
		
				return th;
			}
		}

		// filter the thresholds to get min/max values for
		// warning and alarm classifications
		var warn_min_values = t.filter(filter_thresholds, [ "MIN", "WARNING" ]);
		var warn_max_values = t.filter(filter_thresholds, [ "MAX", "WARNING" ]);
		var alarm_min_values = t.filter(filter_thresholds, [ "MIN", "ALARM" ]);
		var alarm_max_values = t.filter(filter_thresholds, [ "MAX", "ALARM" ]);

		// check value against minimum warning threshold values
		var warning = warn_min_values.some(function(th) { return value < th.value; }) ||
			warn_max_values.some(function(th){ return value > th.value; });

		var alarm = alarm_min_values.some(function(th) { return value < th.value; }) ||
			alarm_max_values.some(function(th){ return value > th.value; });


		var c = classNames({
			"th-badge": true,
			"warning": !alarm && warning,
			"alarm": alarm
		});

		return (
			<span title='Value out of range' className={c}></span>
		);
	}

});

module.exports = ThresholdBadge;