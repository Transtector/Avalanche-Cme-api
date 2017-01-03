/**
 * ChannelPanel.jsx
 * james.brunner@kaelus.com
 *
 * CME generic channel panel component.
 */
 'use strict';

var React = require('react');
var Actions = require('../Actions');
var Constants = require('../Constants');
var Store = require('../Store');

var ThresholdBadge = require('./ThresholdBadge');
var ThresholdGauge = require('./ThresholdGauge');
var ThresholdConfig = require('./ThresholdConfig');

var moment = require('moment');
var classNames = require('classnames');
var assign = require('object-assign'); 

// flot charting requires global jQuery
window.jQuery = require('jquery');
var $ = window.jQuery; // shim for flot

var flot = require('../Flot/jquery.flot');
flot.time = require('../Flot/jquery.flot.time');

var ENTER_KEY_CODE = 13;
var ESCAPE_KEY_CODE = 27;

var FAST_POLL_PERIOD = 1000; // showing current values
var SLOW_POLL_PERIOD = 5000; // showing historic values

var ChannelPanel = React.createClass({
	_pollTimeout: null,
	_pollPeriod: FAST_POLL_PERIOD,
	_pollTime: 0,

	_chAttrInit: false,

	getInitialState: function() {
		return {
			ch: null,
			name: '',
			description: '',
			configOpen: false,
			activeId: '',
			history: 'live',
			historyVisible: false,
			historyPrimaryTraceVisible: true,
			historySecondaryTraceVisible: true
		}
	},

	componentDidMount: function() {
		Store.addChangeListener(Constants.CHANNEL + this.props.id.toUpperCase(), this._onChannelChange);
		this._startPoll();
	},

	componentWillUnmount: function() {
		this._stopPoll();
		Store.removeChangeListener(Constants.CHANNEL + this.props.id.toUpperCase(), this._onChannelChange);		
	},

	render: function() {

		if (!this.state.ch) return null;

		// ch primary/secondary sensor display values
		var primary = this.state.ch.sensors.filter(function(s) { return s.id === 's0' })[0];
		var secondary = this.state.ch.sensors.filter(function(s) { return s.id === 's1' })[0];

		return (
			<div className='ch-wrapper'>
				<div className="ch">
					<div className="ch-header">
						<input type="text" id="name" name="name" 
							   value={this.state.name}
							   className={this.state.activeId === 'name' ? 'active': ''}
							   placeholder="Name"
							   onChange={this._requestChange}
							   onKeyDown={this._onKeyDown}
							   onBlur={this._onBlur} />
						<input type="text" id="description" name="description"
							   value={this.state.description}
							   className={this.state.activeId === 'description' ? 'active': ''}
							   placeholder="Description"
							   onChange={this._requestChange}
							   onKeyDown={this._onKeyDown}
							   onBlur={this._onBlur} />
					</div>

					{this._renderReadout(primary, 'primary')}

					{this._renderReadout(secondary, 'secondary')}

					<button className="btn ch-history-badge" disabled={this.state.ch.error}
						onClick={this._toggleHistoryVisibility}>{this._historyDuration()}</button>				

					{this._renderHistory(primary.unit, secondary.unit)}
	
					{this._renderConfig(primary, secondary)}
				</div>

				{this._renderErrors()}

				<div className={'ch-error-badge' + (this.state.ch.error ? ' error' : '')} title={this.state.ch.error}>!</div>
			</div>
		);
	},

	_renderReadout: function(sensor, sensorClass) {

		if (!sensor) return null;

		var c = "ch-readout " + sensorClass;

		var digits = sensor.value > 1 ? (sensor.value > 10 ? 1 : 2) : (sensor.value < 0.1 ? 1 : 3);

		return (
			<div className={c}>
				<span className="value">{sensor.value.toFixed(digits)}</span>
				<span className="UNIT">{sensor.unit.substr(0, 1)}</span>
				<span className="unit">{sensor.unit.substr(1).toUpperCase()}</span>
				<ThresholdBadge sensor={sensor} />
				<ThresholdGauge sensor={sensor} />
			</div>
		);
	},

	_renderHistory: function(primarySensorUnit, secondarySensorUnit) {

		// data[0] = [ t_start, t_end, t_step ]
		// data[1] = [ DS0, DS1, ..., DSN ]; DSx = "sx_stype_sunit" (e.g., "s0_VAC_Vrms")
		// data[2] = [ [ s0_value, s1_value, ..., sN_value ], [ s0_value, s1_value, ..., sN_value ], ... , [ s0_value, s1_value, sN_value ] ]

		// flot takes data in [ [x, y] ] series arrays, so we'll generate a time, x, for every y value in data[2]
		// and we only have room for 2 sensor values for the channel (primary, secondary), so we can simplify.
		var primarySeries = [], secondarySeries = [],
			primaryTraceColor, secondaryTraceColor,
			primaryTraceDisabled, secondaryTraceDisabled;

		if (this.state.historyVisible && this.state.ch.data) {

			var t_start = this.state.ch.data[0][0] * 1000,
				t_end = this.state.ch.data[0][1] * 1000,
				t_step = this.state.ch.data[0][2] * 1000,

				y1, y1min, y1max, y1sum = 0, y1avg = 0,
				y2, y2min, y2max, y2sum = 0, y2avg = 0;

			//console.log("Plotting history: [ " + t_start + ", " + t_end + ", "  + t_step + " ]");

			this.state.ch.data[2].forEach(function(sensorDataValues, index) {
				var x = t_start + t_step * index,
					y1 = sensorDataValues[0], y2 = sensorDataValues[1];

				if (y1) {
					y1min = !y1min || y1min > y1 ? y1 : y1min;
					y1max = !y1max || y1max < y1 ? y1 : y1max;
					y1sum += y1;
				}

				if (y2) {
					y2min = !y2min || y2min > y2 ? y2 : y2min;
					y2max = !y2max || y2max < y2 ? y2 : y2max;
					y2sum += y2;
				}

				if (this.state.historyPrimaryTraceVisible) {
					primarySeries.push([ x, y1 ]);
				}

				if (this.state.historySecondaryTraceVisible) {
					secondarySeries.push([ x, y2 ]);
				}
			}, this);

			var y1Axis = { }, y2Axis = { position: 'right' };

			if (Math.abs(y1max - y1min) < 0.1)
				y1Axis.autoscaleMargin = 1;

			if (Math.abs(y2max - y2min) < 0.1)
				y2Axis.autoscaleMargin = 1;

			// Hide the y-axis labels if the traces are hidden
			// otherwise try to align the y-axes ticks
			if (this.state.historyPrimaryTraceVisible) {
				primaryTraceDisabled = !this.state.historySecondaryTraceVisible;
				y2Axis.alignTicksWithAxis = 1;
			} else {
				y1Axis.show = false;
			}

			if (this.state.historySecondaryTraceVisible) {
				secondaryTraceDisabled = !this.state.historyPrimaryTraceVisible;
			} else {
			
				y2Axis.show = false; 
			}

			// this generates the plot
			var plot = $.plot($(this._sensorsPlot()), 
				[
					{ data: primarySeries,   yaxis: 1 },
					{ data: secondarySeries, yaxis: 2 }
				],
				{
					xaxes: [ { 
						mode: "time",
						timezone: "browser",
						min: t_start, max: t_end,
						ticks: [ t_start, t_end ],
						timeformat: "%I:%M:%S %P",
					} ],
					yaxes: [ y1Axis, y2Axis ]
				});

			// get flot series colors
			var series = plot.getData();

			primaryTraceColor = series[0].color;
			secondaryTraceColor = series[1].color;
		}

		// class names for ch history div 
		var historyClass = classNames({
			'ch-history': true,
			'open': this.state.historyVisible
		});

		return (
			<div className={historyClass}>

				<div className="ch-history-header">
					<button className="btn close icon-cross" onClick={this._toggleHistoryVisibility}>History</button>
					<button className="btn reset" onClick={this._clearHistory}>Clear</button>
					<button className="btn export icon-download" onClick={this._exportHistory} />
				</div>

				<div className="plot-wrapper">
					<div className="plot sensorPlot" ref="_sensorsPlot"></div>
				</div>

				<div className="ch-history-footer">
					<button className="btn trace pri" disabled={primaryTraceDisabled} onClick={this._togglePrimaryTraceVisibility}>
						<span style={{background: primaryTraceColor}}></span>
						{primarySensorUnit}
					</button>

					<div className="select-wrapper">
						<select className="icon-chevron-down" value={this.state.history} onChange={this._setHistoryUpdate} >
							<option value="live">Live</option>
							<option value="daily">Daily</option>
							<option value="weekly">Weekly</option>
							<option value="monthly">Monthly</option>
							<option value="yearly">Yearly</option>
							</select>
						</div>

					<button className="btn trace sec" disabled={secondaryTraceDisabled} onClick={this._toggleSecondaryTraceVisibility}>
						<span style={{background: secondaryTraceColor }}></span>
						{secondarySensorUnit}
					</button>
				</div>
			</div>
		);
	},

	_renderConfig: function(primarySensor, secondarySensor) {

		// class names for ch configuation div
		var configClass = classNames({
			'ch-config': true,
			'open': this.state.configOpen
		});

		return (
			<div className={configClass}>
				<div className='ch-config-content'>
					<button className='btn'	onClick={this._toggleConfigVisibility}>&laquo;</button>

					<ThresholdConfig channel={this.props.id} sensor={primarySensor} />

				</div>
				<button className='btn' onClick={this._toggleConfigVisibility}>&raquo;</button>
			</div>
		);
	},

	_renderErrors: function () {
		if (!this.state.ch.error) return null;

		var errorMessages = this.state.ch.error.split(', ').map(function(err, i) {
			return <li key={i}>{err}</li>
		});

		return (
			<div className='ch-error'>
				<div className='title errors'>The channel has errors:</div>
				
				<ul className={errorMessages == null ? 'hidden' : ''}>{errorMessages}</ul>
			</div>
		);
	},

	_historyDuration: function() {
		// Display channel time range in plain terms on the history button.
		var timestamps = [], ts_start, ts_end;

		timestamps.push(this.state.ch.first_update * 1000);
		timestamps.push(this.state.ch.last_update * 1000);

		// Calculate the duration of the data
		ts_start = moment.utc(Math.min.apply(null, timestamps));
		ts_end = moment.utc(Math.max.apply(null, timestamps));
		return ts_end.from(ts_start, true);
	},

	_onChannelChange: function() {
		var _this = this,
			newState = { ch: Store.getState().channel_objs[this.props.id] }

		// read name, description into state if not yet initialized (or new ones set)
		if (newState.ch && !this._chAttrInit) {
			newState.name = newState.ch.name;
			newState.description = newState.ch.description;
			this._chAttrInit = true;
		}

		this.setState(newState, function () {

			if (!_this._pollTime) return;

			var age = moment().valueOf() - _this._pollTime,
				period = _this._pollPeriod - (age % _this._pollPeriod);

			//console.log('Updating ' + _this.state.ch.id + ' - age = ' + (age/1000) + " seconds, making request in " + period/1000 + " seconds...");

			clearTimeout(_this._pollTimeout);
			_this._pollTimeout = setTimeout(_this._startPoll, period);
		});
	},

	_startPoll: function() {
		this._pollTime = moment().valueOf();
		Actions.channel(this.props.id, null, this.state.history);
	},

	_stopPoll: function() {
		this._pollTime = 0;
		clearTimeout(this._pollTimeout);
		this._pollTimeout = null;
	},

	_sensorsPlot: function() {

		return this.refs["_sensorsPlot"];
	},

	_controlsPlot: function() {

		return this.refs["_controlsPlot"];
	},

	_toggleConfigVisibility: function() {

		this.setState({ configOpen: !this.state.configOpen });
	},

	_toggleHistoryVisibility: function() {

		if (this.state.historyVisible) {
			this._stopPoll();
			this._pollPeriod = FAST_POLL_PERIOD;
			this._startPoll();
		} else {
			this._pollPeriod = SLOW_POLL_PERIOD;
		}

		this.setState({ historyVisible: !this.state.historyVisible });
	},

	_setHistoryUpdate: function(e) {
		this.setState({ history: e.target.value });
	},

	_clearHistory: function() {
		if (confirm("Are you sure?  This action cannot be undone.")) {

			this.setState({ history: 'live', historyVisible: false });
			Actions.deleteChannel(this.props.id);
		}
	},

	_exportHistory: function() {

		alert("Sorry - this feature not yet implemented.");
	},

	_togglePrimaryTraceVisibility: function () {

		this.setState({ historyPrimaryTraceVisible: !this.state.historyPrimaryTraceVisible });
	},

	_toggleSecondaryTraceVisibility: function () {

		this.setState({ historySecondaryTraceVisible: !this.state.historySecondaryTraceVisible });
	},

	// Making channel object changes just
	// changes the channel state (in the UI).
	// Press ENTER to send changes to server
	// or ESCAPE to reset.
	_requestChange: function(e) {
		var v = e.target.value,
			n = e.target.name,
			obj = {};
		obj[n] = v;

		this.setState(assign({ activeId: e.target.id }, obj));
	},

	// ENTER to persist changes to server
	// ESCAPE to reset changes back to last saved state
	_onKeyDown: function(e) {
		if (e.keyCode === ESCAPE_KEY_CODE) {
			this.setState({
				name: this.state.ch.name,
				description: this.state.ch.description
			});
		}

		if (e.keyCode !== ENTER_KEY_CODE)
			return;

		// ENTER pressed - let blur handle update
		e.target.blur();
	},

	_onBlur: function(e) {
		var v = e.target.value.trim(),
			n = e.target.name,
			obj = {};

		var _this = this;
		this.setState({ activeId: '' });

		obj[n] = v;

		this._chAttrInit = false;
		this.setState(obj, function () {
			console.log('You want to update: ', obj);
			Actions.channel(_this.props.id, obj);
		});
	},

	_requestControlChange: function(e) {
		// control(chId, controlId, { name: name, state: state })
		Actions.control(this.props.id, e.target.id, { name: 'Toggle switch', state: e.target.checked });
	}
});

module.exports = ChannelPanel;