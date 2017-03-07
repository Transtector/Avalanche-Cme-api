/**
 * ThresholdGauge.jsx
 * james.brunner@kaelus.com
 *
 * Channel panel readout threshold gauge component.
 */
 'use strict';

var React = require('react');

var classNames = require('classnames');

function isNumeric(n) { return !isNaN(parseFloat(n)) && isFinite(n); }

function toPercentage(value, nominal, precision) {
	var precision = precision || 1; 
	if (!isNumeric(value) || !isNumeric(nominal)) return value;
	return (100 * ((parseFloat(value) / parseFloat(nominal)) - 1)).toFixed(precision); 
}

var ThresholdGauge = React.createClass({

	render: function() {

		if (!this.props.sensor) return null; // no sensor

		var t = this.props.sensor.thresholds;
		var d_range = this.props.sensor.display_range;
		var r = { 
			min: this.props.sensor.range && this.props.sensor.range.length > 0 ? this.props.sensor.range[0] : '',
			max: this.props.sensor.range && this.props.sensor.range.length > 1 ? this.props.sensor.range[1] : ''
		}
		// d_range must be within hardware range 
		r.min = d_range && d_range[0] > r.min ? d_range[0] : r.min;
		r.max = d_range && d_range[1] < r.max ? d_range[1] : r.max;

		if (!t || t.length == 0) return null; // no thresholds
		if (!(isNumeric(r.min) && isNumeric(r.max))) return null; // no range

		// calculate relative positioning as a left percentage of range
		function pos(v, fromRight) {
			var p = 100 * ((v - r.min)  / Math.abs(r.max - r.min));
			return fromRight ? 100 - p : p
		}

		function filter_thresholds(th) {
			if (th.direction.toUpperCase() == this[0].toUpperCase() && 
				th.classification.toUpperCase() == this[1].toUpperCase()) {
		
				return th;
			}
		}

		function add_percent(pos) {
			if (pos.left)
				pos.left = pos.left + '%';
			if (pos.right)
				pos.right = pos.right + '%';
		}

		// filter the thresholds to get min/max values for
		// warning and alarm classifications
		var warn_min_values = t.filter(filter_thresholds, [ "MIN", "WARNING" ]);
		var warn_max_values = t.filter(filter_thresholds, [ "MAX", "WARNING" ]);
		var alarm_min_values = t.filter(filter_thresholds, [ "MIN", "ALARM" ]);
		var alarm_max_values = t.filter(filter_thresholds, [ "MAX", "ALARM" ]);

		// Set positioning styles for the UI elements
		var pointerPos = pos(this.props.sensor.value);
		var pointerStyle = (pointerPos > 0 && pointerPos <= 100) ? { left: pointerPos } : { display: 'none' };

		// warning block is top-level GREEN
		var warningStyle = {
			left: warn_min_values.length > 0 ? pos(warn_min_values[0].value) : 0,
			right: warn_max_values.length > 0 ? pos(warn_max_values[0].value, true) : 0
		}

		// alarm block is next below warning and YELLOW
		var alarmStyle = {
			left: alarm_min_values.length > 0 ? pos(alarm_min_values[0].value) : 0,
			right: alarm_max_values.length > 0 ? pos(alarm_max_values[0].value, true) : 0
		}
		// bottom gauge track is RED

		// make a second pass for clarity and to ensure that alarm
		// thresholds override the warning thresholds
		warningStyle.left = Math.max(warningStyle.left, alarmStyle.left);
		warningStyle.right = Math.max(warningStyle.right, alarmStyle.right);

		// finally, add the '%' character for the styles
		add_percent(warningStyle);
		add_percent(alarmStyle);
		add_percent(pointerStyle);

		var deviation = toPercentage(this.props.sensor.value, this.props.sensor.nominal);

		return (
			<div className="th-gauge">
				<div className="alarm" style={alarmStyle}></div>
				<div className="warning" style={warningStyle}></div>
				<div className="pointer" style={pointerStyle}><span>{deviation}</span></div>
			</div>
		);
	}

});

module.exports = ThresholdGauge;