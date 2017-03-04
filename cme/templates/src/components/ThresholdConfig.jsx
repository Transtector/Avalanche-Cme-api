/**
 * ThresholdConfig.jsx
 * james.brunner@kaelus.com
 *
 * Configure the channel thresholds
 */
 'use strict';

var React = require('react');

var classNames = require('classnames');
var assign = require('object-assign'); // ES6 polyfill

var ENTER_KEY_CODE = 13;
var ESCAPE_KEY_CODE = 27;

function isNumeric(n) { return !isNaN(parseFloat(n)) && isFinite(n); }

function toPercentage(value, nominal) { 
	if (!isNumeric(value) || !isNumeric(nominal)) return value;
	return 100 * ((parseFloat(value) / parseFloat(nominal)) - 1); 
}

function toAbsolute(value, nominal) { 
	if (!value || !isNumeric(value) || !nominal || !isNumeric(nominal)) return value;
	return nominal * (1 + (value / 100)); 
}

function Thresholds(thresholds) {
	var TH_COUNT = 0;

	function thCount() {
		TH_COUNT++;
		return TH_COUNT;
	}

	function filterThreshold(th) {
		if (th.direction.toUpperCase() == this.d.toUpperCase() && 
			th.classification.toUpperCase() == this.c.toUpperCase()) {
	
			return th;
		}
	}

	function Threshold(direction, classification) {

		var filteredThresholds = thresholds.filter(filterThreshold, { d: direction, c: classification });

		return filteredThresholds.length > 0 
			? filteredThresholds[0] 
			: { id: '_th' + thCount(), value: '', direction: direction.toUpperCase(), classification: classification.toUpperCase() };
	}

	return {
		warning_min: Threshold("MIN", "WARNING"),
		warning_max: Threshold("MAX", "WARNING"),
		alarm_min: Threshold("MIN", "ALARM"),
		alarm_max: Threshold("MAX", "ALARM")
	} 
}

var ThresholdConfig = React.createClass({

	getInitialState: function() {
		// Component allows editing of 4 threshold values:
		// min/max "warning" and min/max "alarm".  We can
		// parse and load the initial values from the sensor
		// passed in component props.
		var ths = Thresholds(this.props.sensor && this.props.sensor.thresholds || []);

		var nominal = this.props.sensor.nominal || 0;
		var display_range = this.props.sensor.display_range || [];

		this._initial = ths; // save a copy of the initial threshold values

		var state = assign({ 
			display_range: display_range,
			nominal: nominal,  // holds a nominal value for percentage thresholds
			percent: false, // use percentage thresholds
			active: '' // tracks the active input element id
		}, ths);

		return state;
	},

	// This component gets passed a sensor object.  We'll cache the sensor 
	// attributes in the component state, and when necessary submit updates
	// to the server (via an Action...) that will trigger updates upstream
	// of this component.
	componentWillReceiveProps: function(nextProps) {

		var ths = nextProps.sensor && nextProps.sensor.thresholds || [];
		var nextThs = Thresholds(ths);

		// See if any (some) of the new thresholds are
		// changed from the initial thresholds.  This is
		// necessary because this component is refreshing
		// along with the sensor value, and the thresholds
		// may NOT be changing.
		for (var th in nextThs) {

			var nextValue = this.state.percent ? toPercentage(nextThs[th].value, this.state.nominal) : nextThs[th].value;

			if (nextThs[th].value !== this._initial[th].value) {

				this._initial[th] = nextThs[th]; // update initial threshold to new threshold

				var obj = {}
				obj[th] = nextThs[th];
				this.setState(obj); // set the internal threshold state
			}
		}
	},

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

		var unit = this.props.sensor.unit && this.props.sensor.unit.substr(0, 1).toUpperCase();
		var subunit = this.props.sensor.unit && this.props.sensor.unit.length > 1 ? this.props.sensor.unit.substr(1).toUpperCase() : '';

		// thresholds are % of nominal value
		var nominal = this.state.nominal;
		var percent = this.state.percent;
		var active = this.state.active;

		var _this = this;

		function renderValue(value) {
			if (value == null) return ''; // coerce works for undefined as well...

			if (percent && isNumeric(value) && isNumeric(nominal)) {
				value = toPercentage(value, nominal);
			}

			return isNumeric(value) ? parseFloat(value).toFixed(0) : value;
		}

		function renderClass(id, value) {
			return classNames({
				'active': id === active,
				'error': value && !isNumeric(value)
			}); 
		}

		function renderInput(threshold) {
			var obj = _this.state[threshold];
			return (
				<td className='input' colSpan='2' rowSpan='2'>
					<input type='text' id={obj.id} name={threshold} disabled={true}
						className={renderClass(obj.id, obj.value)}
						value={renderValue(obj.value)}
						onChange={_this._requestChange}
						onKeyDown={_this._onKeyDown}
						onBlur={_this._onBlur} />
					<span className={percent ? 'percent' : 'hidden'}>%</span>
				</td>
			);
		}

		return (
			<div className='th-config'>
				<table>
					<thead>
						<tr className='range'>
							<td></td>
							<td colSpan='2'>
								<input type='text' id='range-min' name='range-min' 
									value={r.min} disabled='disabled'/>
							</td>
							<td colSpan='3'>
								<label htmlFor='nominal' className='nominal-unit'>Nominal
									<input type='text' id='nominal' name='nominal' disabled={true}
										value={nominal} className={renderClass('nominal', nominal)}
										onChange={this._requestChange} onKeyDown={this._onKeyDown} onBlur={this._onBlur} />
									{unit}
									<span>{subunit.toLowerCase()}</span>
								</label>
							</td>
							
							<td colSpan='2'>
								<input type='text' id='range-max' name='range-max' 
									value={r.max} disabled='disabled'/>
							</td>
							<td></td>
						</tr>
						<tr className='gauge'>
							<td></td><td></td>
							<td className='alarm'></td>
							<td className='warning'></td>
							<td className='nominal'></td>
							<td className='warning'></td>
							<td className='alarm'></td>
							<td></td><td></td>
						</tr>
					</thead>
					<tbody>
						<tr>
							{renderInput('alarm_min')}
							<td className='b r'></td>
							<td className='r'></td><td className='r'></td><td className='r'></td>
							<td className='b'></td>
							{renderInput('alarm_max')}
						</tr>
						<tr><td></td><td className='r'></td><td className='r'></td><td></td><td></td></tr>
						<tr>
							<td></td>
							{renderInput('warning_min')}
							<td className='b r'></td>
							<td className='r'></td>
							<td className='b'></td>
							{renderInput('warning_max')}
							<td></td>
						</tr>
						<tr><td></td><td></td><td></td><td></td><td></td></tr>
					</tbody>
				</table>
				<div className='th-nominal' title='Enter a nominal value to set thresholds as percentages.'>
					<input type='checkbox' id='percent' name='percent' value='Use percentages'
						checked={this.state.percent} onChange={this._togglePercent} />
					<label htmlFor='percent'>Show percentages</label>
					
				</div>
			</div>
		);
	},

	// Change requests just stay local (in state) until
	// press ENTER to send changes to server or ESCAPE to reset.
	_requestChange: function(e) {
		var v = e.target.value,
			n = e.target.name; // e.g., 'warning_min', 'alarm_max', ...
			
		var obj = {};

		this.setState({ active: e.target.id });

		// state thresholds are multi-level objects, so we have
		// to treat them a little different to update their value
		if (n === 'nominal') {
			obj[n] = v;
		} else {
			obj[n] = assign({}, this.state[n]);
			obj[n].value = this.state.percent ? toAbsolute(v, this.state.nominal) : v;
		}
		this.setState(obj);
	},

	// ENTER to persist changes to server
	// ESCAPE to reset changes back to last saved state
	_onKeyDown: function(e) {

		var v = e.target.value.trim(),
			n = e.target.name,
			obj = {};

		// ESCAPE resets all inputs to initial values
		if (e.keyCode === ESCAPE_KEY_CODE) {
			if (n === 'nominal') {
				// ESCAPE for nominal value just clears it
				obj[n] = '';
			} else {
				// reset the threshold to _initial value
				obj[n] = this._initial[n];
			}
			this.setState(obj);
			this.setState({ active: '' });
			return;
		}

		// Regular key press - just return to update input value
		// (_requestChange() will handle state update)
		if (e.keyCode !== ENTER_KEY_CODE) return;

		// Else <ENTER> pressed!
		// We'll blur the input control here to provide some more
		// feedback that the value has been accepted - let the
		// blur handler request Actions() to update if necessary
		e.target.blur();		
	},

	_onBlur: function(e) {
		var v = e.target.value.trim(),
			n = e.target.name,
			obj = {};

		// remove active state
		this.setState({ active: '' });

		// if 'nominal' input just apply new value
		if (n === 'nominal') {
			this.setState({ nominal: v });
			return;
		}

		// Before we submit a new threshold, we check the validation
		// flag (className has 'error') and just return if the input
		// value is invalid.
		if (e.target.className.includes('error')) return;

		// Get the threshold we're working with
		obj[n] = this.state[n];

		// If there's no id and the value we're trying to set is empty, then this is a NOP
		if (!obj[n].id && !v) return;

		// If there's a "new" id ("_thX"), but the value is empty - ignore
		if (obj[n].id && obj[n].id.substr(0, 1) === '_' && !v) return;

		// At this point we have validated threshold value.
		// Make it a float and convert from percentage if necessary.		
		var newvalue = this.state.percent ? toAbsolute(v, this.state.nominal) : parseFloat(v);

		// New thresholds don't have any id, but we've added one internally
		// that starts with underscore ('_'), so we need to delete it
		// before submitting the change to the server.
		if (obj[n].id && obj[n].id.substr(0, 1) === '_')
			delete obj[n].id;

		// Set the state and invoke the thresholds Actions method (it takes an array of thresholds)
		var _this = this;
		this.setState(obj, function () {
			Actions.thresholds(_this.props.channel, _this.props.sensor.id, [ _this.state[n] ]);
		});
	},

	_togglePercent: function() {

		this.setState({ percent: !this.state.percent });
	}

});

module.exports = ThresholdConfig;