/**
 * ZoneInput.jsx
 * james.brunner@kaelus.com
 *
 * A react component for manipulating time zone offsets.
 */

var React = require('react');

function format(n, s) {
    var n = Math.abs(n) + '',
    	s = s || '';

	return s + (n.length >= 2 ? n : new Array(2 - n.length + 1).join('0') + n);
}

function decimalHours(h, m) {
	var mult = (h >= 0) ? 1 : -1;

	return h + mult * m / 60;
}

function parseDecimalHours(v) {
	var h = Math.trunc(v),
		m = 15 * Math.round(4 * (Math.abs(v) % 1));

	return {
		hours: h,
		minutes: m
	}
}

var ZoneInput = React.createClass({

	propTypes: {
		value:  React.PropTypes.number.isRequired,
		onChange: React.PropTypes.func
	},

	render: function() {
		var time = parseDecimalHours(this.props.value);

		return (
			<div id={this.props.id} className="zc">
				<div className="zcCounter">
					<button className="zcBtn" onClick={this._onHourUp}>▲</button>
					<div className="zcCount">{format(time.hours, (time.hours >= 0 ? '+' : '-'))}</div>
					<button className="zcBtn" onClick={this._onHourDown}>▼</button>
				</div>

				<div className="zcSeparator">:</div>

				<div className="zcCounter">
					<button className="zcBtn" onClick={this._onMinUp}>▲</button>
					<div className="zcCount">{format(time.minutes)}</div>
					<button className="zcBtn" onClick={this._onMinDown}>▼</button>
				</div>
			</div>
		);
	},

	_onHourUp: function() {
		var time = parseDecimalHours(this.props.value),
			hours = (time.hours + 13) % 27 - 12,
			v = decimalHours(hours, time.minutes);

		this.props.onChange(v);
	},

	_onHourDown: function() {
		var time = parseDecimalHours(this.props.value),
			hours = (time.hours - 15) % 27 + 14,
			v = decimalHours(hours, time.minutes);

		this.props.onChange(v);
	},

	_onMinUp: function() {
		var time = parseDecimalHours(this.props.value),
			minutes = (time.minutes + 15) % 60,
			v = decimalHours(time.hours, minutes);

		this.props.onChange(v);
	},

	_onMinDown: function() {
		var time = parseDecimalHours(this.props.value),
			minutes = (time.minutes + 45) % 60,
			v = decimalHours(time.hours, minutes);

		this.props.onChange(v);
	}
});

module.exports = ZoneInput;