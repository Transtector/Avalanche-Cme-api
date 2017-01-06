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
			history: '',
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

					{this._renderHistory(primary, secondary)}

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

	_renderHistory: function(primarySensor, secondarySensor) {

		// data[0] = [ t_start, t_end, t_step ]
		// data[1] = [ DS0, DS1, ..., DSN ]; DSx = "sx_stype_sunit" (e.g., "s0_VAC_Vrms")
		// data[2] = [ [ s0_value, s1_value, ..., sN_value ], [ s0_value, s1_value, ..., sN_value ], ... , [ s0_value, s1_value, sN_value ] ]
		// if not 'live', then data[2] is AVERAGE and there are more data...
		// data[3] is MIN 
		// data[4] is MAX.

		// flot takes data in [ [x, y] ] series arrays, so we'll generate a time, x, for every y value in data[2]
		// and we only have room for 2 sensor values for the channel (primary, secondary), so we can simplify.
		var primarySeries, secondarySeries,
			primaryTraceColor, secondaryTraceColor,
			primaryTraceDisabled, secondaryTraceDisabled;

		if (this.state.historyVisible && this.state.ch.data) {

			// get start, stop, and step timestamps
			var times = this.state.ch.data[0],
				t_start = times[0] * 1000, 
				t_end = times[1] * 1000,
				t_step = times[2] * 1000;

			// track current, min and max y-values for y-axes scaling
			var y1, y1min, y1max, y2, y2min, y2max;

			// live, daily, weekly, monthly, yearly history setting
			var history = this.state.history,
				live = (history === 'live' || this.state.ch.data.length <= 3);

			// additional data traces if not live
			var MIN, MAX;  
			if (!live) {
				MIN = this.state.ch.data[3]; // MIN data from channel
				MAX = this.state.ch.data[4]; // MAX data from channel
			}

			// process each trace data point
			this.state.ch.data[2].forEach(function(sensorDataValues, index) {
				var t = t_start + t_step * index,
					y1 = sensorDataValues[0],
					y2 = sensorDataValues[1];

				// Intialize the series data arrays
				if (index == 0) {
					if (live) {
						primarySeries = [ [] ]; // LIVE data
						secondarySeries = [ [] ]; 
					} else {
						primarySeries = [[], [], []]; // MAX, MIN, AVG data
						secondarySeries = [[], [], []];
					}
				} 

				// Calculate 'live' min/max for y-axis scaling
				if (live) {
				   if (y1) {
						y1min = !y1min || y1min > y1 ? y1 : y1min;
						y1max = !y1max || y1max < y1 ? y1 : y1max;
					}

					if (y2) {
						y2min = !y2min || y2min > y2 ? y2 : y2min;
						y2max = !y2max || y2max < y2 ? y2 : y2max;
					}
				}

				if (this.state.historyPrimaryTraceVisible) {
					if (live) {
						primarySeries[0].push([ t, y1 ]);

					} else {
						// Add the traces in order as AVG, MIN, MAX.
						// Add a third y-value to the AVG and MAX trace points
						// to provide fill-to values.

						// Push MAX (w/MIN fill-to), then MIN, then AVG traces
						primarySeries[0].push([ t, MAX[index][0], MIN[index][0] ]);  // MAX point w/MIN fill-to
						primarySeries[1].push([ t, MIN[index][0] ]); // MIN point
						primarySeries[2].push([ t, y1 ]); // AVG point
					}

				}

				if (this.state.historySecondaryTraceVisible) {
					if (live) {
						secondarySeries[0].push([ t, y2 ]);

					} else {
						// Add the traces in order as AVG, MIN, MAX.
						// Add a third y-value to the AVG and MAX trace points
						// to provide fill-to values.

						// Push MAX (w/MIN fill-to), then MIN, then AVG traces
						secondarySeries[0].push([ t, MAX[index][1], MIN[index][1] ]);  // MAX point w/MIN fill-to
						secondarySeries[1].push([ t, MIN[index][1] ]); // MIN point
						secondarySeries[2].push([ t, y1 ]); // AVG point
					}
				}

			}, this);

			var y1Axis = { }, 
				y2Axis = { position: 'right' };

			if (live && Math.abs(y1max - y1min) < 0.1)
				y1Axis.autoscaleMargin = 1;

			if (live && Math.abs(y2max - y2min) < 0.1)
				y2Axis.autoscaleMargin = 1;

			// Hide the y-axis labels if the traces are hidden
			// otherwise try to align the y-axes ticks
			if (this.state.historyPrimaryTraceVisible)
				y2Axis.alignTicksWithAxis = 1;

			y1Axis.show = this.state.historyPrimaryTraceVisible;
			y2Axis.show = this.state.historySecondaryTraceVisible; 

			primaryTraceDisabled = !this.state.historySecondaryTraceVisible;
			secondaryTraceDisabled = !this.state.historyPrimaryTraceVisible;

			var plotSeries = [], plotOptions;

			plotOptions = {
				xaxes: [ { 
					mode: "time",
					timezone: "browser",
					min: t_start, max: t_end,
					ticks: [ t_start, t_end ],
					timeformat: "%I:%M:%S %P",
				} ],
				yaxes: [ y1Axis, y2Axis ]
			};

			if (history == 'live') {
				plotSeries.push({ data: primarySeries[0], yaxis: 1 });
				plotSeries.push({ data: secondarySeries[0], yaxis: 2 });

			} else {
				
				// Add MAX, MIN, and AVG traces for each sensor

				plotSeries.push({ data: primarySeries[0], yaxis: 1, color: '#ffff00', lines: { fill: 0.4, lineWidth: 1 }, shadowSize: 0 });
				plotSeries.push({ data: primarySeries[1], yaxis: 1, color: '#ffff00', lines: { lineWidth: 1 }, shadowSize: 0 });
				plotSeries.push({ data: primarySeries[2], yaxis: 1, color: '#ffff00' });

				plotSeries.push({ data: secondarySeries[0], yaxis: 2, color: '#ff0000', lines: { fill: 0.4, lineWidth: 1 }, shadowSize: 0 });
				plotSeries.push({ data: secondarySeries[1], yaxis: 2, color: '#ff0000', lines: { lineWidth: 1 }, shadowSize: 0 });
				plotSeries.push({ data: secondarySeries[2], yaxis: 2, color: '#ff0000' });

			}

			// this generates the plot
			var plot = $.plot($(this._sensorsPlot()), plotSeries, plotOptions);

			// get flot series colors
			var series = plot.getData();

			primaryTraceColor = series[0].color;
			secondaryTraceColor = series[1].color;
		}

		return (
			<div className={'ch-history' + (this.state.historyVisible ? ' open' : '')}>

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
						{primarySensor && primarySensor.unit ? primarySensor.unit : ''}
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
						{secondarySensor && secondarySensor.unit ? secondarySensor.unit : ''}
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

		var h = ''; // to clear the history selector

		if (this.state.historyVisible) {
			this._stopPoll();
			this._pollPeriod = FAST_POLL_PERIOD;
			this._startPoll();
		} else {
			h = 'live';
			this._pollPeriod = SLOW_POLL_PERIOD;
		}

		this.setState({ history: h, historyVisible: !this.state.historyVisible });
	},

	_setHistoryUpdate: function(e) {

		this.setState({ history: e.target.value });
	},

	_clearHistory: function() {
		if (confirm("Are you sure?  This action cannot be undone.")) {
			Actions.deleteChannel(this.props.id);
			this._toggleHistoryVisibility();
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