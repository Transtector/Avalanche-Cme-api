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

function getSensorThreshold(s, classification, direction) {
	if (!s || !s.thresholds || s.thresholds.length == 0) return null;

	var th = s.thresholds.find(function(th){
		return th.classification == classification && th.direction == direction;
	});

	return th && th.value;
}

var TRACE_COLORS = {
	'WARNING': '#ff0',
	'ALARM': '#f00',
	'PRI_DATA': '#EB942A',
	'SEC_DATA': '#2296E0',
	'FILL': 0.2
}

var ChannelPanel = React.createClass({
	_pollTimeout: null,
	_pollPeriod: FAST_POLL_PERIOD,
	_pollTime: 0,

	getInitialState: function() {
		return {
			chRequest: false,
			ch: null,
			name: '',
			description: '',
			configOpen: false,
			activeId: '',
			polling: false,
			recording: false,
			alarmsVisible: false,
			history: '',
			historyOptions: null,
			historyVisible: false,
			historyTraceVisible: [ true, true ]
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
							   value={this.state.name} disabled={true}
							   className={this.state.activeId === 'name' ? 'active': ''}
							   placeholder="Name"
							   onChange={this._requestChange}
							   onKeyDown={this._onKeyDown}
							   onBlur={this._onBlur} />
						<input type="text" id="description" name="description"
							   value={this.state.description} disabled={true}
							   className={this.state.activeId === 'description' ? 'active': ''}
							   placeholder="Description"
							   onChange={this._requestChange}
							   onKeyDown={this._onKeyDown}
							   onBlur={this._onBlur} />
					</div>

					{this._renderReadout(primary, 'primary', !secondary)}

					{this._renderReadout(secondary, 'secondary')}

					{this._renderControls()}

					<button className="btn ch-history-badge" disabled={this.state.ch.error || !this.state.historyOptions}
						title='Display channel history'
						onClick={this._toggleHistoryVisibility}>{this._historyDuration()}</button>

					{this._renderHistory(primary, secondary)}

					{this._renderAlarms()}

					{this._renderConfig(primary, secondary)}
				</div>

				{this._renderErrors()}

				<div className={'ch-error-badge' + (this.state.ch.error ? ' error' : '')} title={this.state.ch.error}>!</div>
			</div>
		);
	},

	_renderReadout: function(sensor, sensorClass, singleSensor) {

		if (!sensor) return null;

		var digits = sensor.value > 1 ? (sensor.value > 10 ? 1 : 2) : (sensor.value < 0.1 ? 1 : 3);

		var cls = classNames('ch-readout', sensorClass, { 'single': singleSensor });

		return (
			<div className={cls}>
				<input type="text" id={sensor.id} name={sensor.id} 
							   value={sensor.name}
							   placeholder="Name" disabled={true} />
				<span className="value">{sensor.value && sensor.value.toFixed(digits)}</span>
				<span className="UNIT">{sensor.unit.substr(0, 1)}</span>
				<span className="unit">{sensor.unit.substr(1).toUpperCase()}</span>
				<ThresholdBadge sensor={sensor} />
				<ThresholdGauge sensor={sensor} />
			</div>
		);
	},

	_renderControls: function() {
		var playClass = 'btn ' + (this.state.polling ? 'icon-pause' : 'icon-play'),
			playTitle = this.state.polling ? 'Pause channel updates' : 'Resume channel updates',
			recordClass = 'btn ' + (this.state.recording ? 'icon-record-check' : 'icon-record'),
			recordTitle = this.state.recording ? 'Stop recording all alarms' : 'Record all alarms',
			chStatus = 'ch-status' + (this.state.chRequest ? ' active' : '');

		return (
			<div className='ch-controls'>
				<div className={chStatus}></div>
				<button className={playClass} title={playTitle} onClick={this._togglePolling} />
				{ /*
				<button className={recordClass} title={recordTitle} onClick={this._toggleRecording} />
				<button className='btn icon-view-alarms' title='View channel alarms' onClick={this._toggleAlarmsVisibility} />
				*/ }
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
		var y1Series, y2Series, traceDisabled = [ false, !secondarySensor ];

		if (this.state.historyVisible && this.state.ch.data && this.state.historyOptions) {

			// get start, stop, and step timestamps
			var times = this.state.ch.data[0],
				t_start = times[0] * 1000, 
				t_end = times[1] * 1000,
				t_step = times[2] * 1000;

			// threshold values
			var ALARM_MAX = getSensorThreshold(primarySensor, 'ALARM', 'MAX'),
				ALARM_MIN = getSensorThreshold(primarySensor, 'ALARM', 'MIN'),
				WARN_MAX = getSensorThreshold(primarySensor, 'WARNING', 'MAX'),
				WARN_MIN = getSensorThreshold(primarySensor, 'WARNING', 'MIN');

			// track current, min and max y-values for y-axes scaling
			var y1, y2, y1min, y1max, y2min, y2max;
				
			y1min = primarySensor.display_range[0],
			y1max = primarySensor.display_range[1];

			if (secondarySensor) {
				y2min = secondarySensor.display_range[0];
				y2max = secondarySensor.display_range[1];
			}

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
			this.state.ch.data[2].forEach(function(sensorDataValues, index, data) {
				var t = t_start + t_step * index,
					y1 = sensorDataValues[0],
					y2 = sensorDataValues[1];

				// Intialize the series data arrays
				if (index == 0) {
					if (live) {

						y1Series = [ 
							[ [t, ALARM_MAX, y1max ] ],
							[ [t, ALARM_MIN, y1min ] ],
							[ [t, WARN_MAX, ALARM_MAX ] ],
							[ [t, WARN_MIN, ALARM_MIN ] ],
							[]
						];

						y2Series = [ [] ]; 

					} else {
						y1Series = [[], [], []]; // MAX, MIN, AVG data
						y2Series = [[], [], []];
					}

				} else if (index == data.length - 1) {
					// Add last threshold points
					if (live) {
						y1Series[0].push([ t, ALARM_MAX, y1max ]);
						y1Series[1].push([ t, ALARM_MIN, y1min ]);
						y1Series[2].push([ t, WARN_MAX, ALARM_MAX ]);
						y1Series[3].push([ t, WARN_MIN, ALARM_MIN ]);
					}

				}

				if (this.state.historyTraceVisible[0]) {
					if (live) {
						y1Series[4].push([ t, y1 ]);

					} else {
						// Add the traces in order as AVG, MIN, MAX.
						// Add a third y-value to the AVG and MAX trace points
						// to provide fill-to values.

						// Push MAX (w/MIN fill-to), then MIN, then AVG traces
						y1Series[0].push([ t, MAX[index][0], MIN[index][0] ]);  // MAX point w/MIN fill-to
						y1Series[1].push([ t, MIN[index][0] ]); // MIN point
						y1Series[2].push([ t, y1 ]); // AVG point
					}

				}

				if (this.state.historyTraceVisible[1] && !!secondarySensor) {
					if (live) {
						y2Series[0].push([ t, y2 ]);

					} else {
						// Add the traces in order as AVG, MIN, MAX.
						// Add a third y-value to the AVG and MAX trace points
						// to provide fill-to values.

						// Push MAX (w/MIN fill-to), then MIN, then AVG traces
						y2Series[0].push([ t, MAX[index][1], MIN[index][1] ]);  // MAX point w/MIN fill-to
						y2Series[1].push([ t, MIN[index][1] ]); // MIN point
						y2Series[2].push([ t, y2 ]); // AVG point
					}
				}
			}, this);

			function tickFormatter(val, axis) {
				var digits = val > 1 ? (val > 10 ? 1 : 2) : (val < 0.1 ? 1 : 3);
				return val.toFixed(digits);
			}

			var y1Axis = { tickFormatter: tickFormatter, min: y1min, max: y1max }, 
				y2Axis = { position: 'right', tickFormatter: tickFormatter };

			//if (live && Math.abs(y1max - y1min) < 0.1)
			//	y1Axis.autoscaleMargin = 1;

			//if (live && Math.abs(y2max - y2min) < 0.1)
			//	y2Axis.autoscaleMargin = 1;

			y1Axis.show = this.state.historyTraceVisible[0];
			y2Axis.show = this.state.historyTraceVisible[1] && !!secondarySensor; 

			// Disable alternate trace visibility buttons
			// so user can't turn both off at the same time.
			traceDisabled = [ !y2Axis.show, !y1Axis.show ];

			// align y2 axis to y1 if it's visible
			if (y1Axis.show)
				y2Axis.alignTicksWithAxis = 1;

			var plotSeries = [];
			var plotOptions = {
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
				// push ALARM_MAX, ALARM_MIN, WARN_MAX, WARN_MIN, DATA
				plotSeries.push({ data: y1Series[0], yaxis: 1, color: TRACE_COLORS['ALARM'], lines: { fill: TRACE_COLORS['FILL'], lineWidth: 1, zero: false }, shadowSize: 0 }); // ALARM MAX
				plotSeries.push({ data: y1Series[1], yaxis: 1, color: TRACE_COLORS['ALARM'], lines: { fill: TRACE_COLORS['FILL'], lineWidth: 1, zero: false }, shadowSize: 0 }); // ALARM MIN
				plotSeries.push({ data: y1Series[2], yaxis: 1, color: TRACE_COLORS['WARNING'], lines: { fill: TRACE_COLORS['FILL'], lineWidth: 1, zero: false }, shadowSize: 0 }); // WARN MAX
				plotSeries.push({ data: y1Series[3], yaxis: 1, color: TRACE_COLORS['WARNING'], lines: { fill: TRACE_COLORS['FILL'], lineWidth: 1, zero: false }, shadowSize: 0 }); // WARN MIN
				plotSeries.push({ data: y1Series[4], yaxis: 1, color: TRACE_COLORS['PRI_DATA'] }); // DATA

				plotSeries.push({ data: y2Series[0], yaxis: 2 });

			} else {
				// Add MAX, MIN, and AVG traces for each sensor
				plotSeries.push({ data: y1Series[0], yaxis: 1, color: TRACE_COLORS['PRI_DATA'], lines: { fill: TRACE_COLORS['FILL'], lineWidth: 1, zero: false }, shadowSize: 0 });
				plotSeries.push({ data: y1Series[1], yaxis: 1, color: TRACE_COLORS['PRI_DATA'], lines: { lineWidth: 1 }, shadowSize: 0 });
				plotSeries.push({ data: y1Series[2], yaxis: 1, color: TRACE_COLORS['PRI_DATA'], shadowSize: 0 });

				plotSeries.push({ data: y2Series[0], yaxis: 2, color: TRACE_COLORS['SEC_DATA'], lines: { fill: TRACE_COLORS['FILL'], lineWidth: 1, zero: false }, shadowSize: 0 });
				plotSeries.push({ data: y2Series[1], yaxis: 2, color: TRACE_COLORS['SEC_DATA'], lines: { lineWidth: 1 }, shadowSize: 0 });
				plotSeries.push({ data: y2Series[2], yaxis: 2, color: TRACE_COLORS['SEC_DATA'], shadowSize: 0 });
			}
		}

		var _this = this;
		function updatePlot(el) {
			if (!_this.state.historyVisible || !_this.state.ch.data || !el) return;

			// generate the plot here
			var plot = $.plot($(el), plotSeries, plotOptions);
		}

		// get history plot drop-downs from historyOptions.   These are
		// ultimately built from the channel's RRA (round-robin archives)
		// defined in the channel configuration file.
		var historyOptions = this.state.historyOptions.map(function (ho) {

			return <option key={ho} value={ho}>{ho}</option>;
		});

		return (
			<div className={'ch-plot' + (this.state.historyVisible ? ' open' : '')}>

				<div className="ch-plot-header">
					<button className="btn close icon-cross" onClick={this._toggleHistoryVisibility}></button>
					<button className="btn reset" onClick={this._clearHistory}>Clear History</button>
					<button className="btn export icon-download" onClick={this._exportHistory} />
				</div>

				<div className="plot-wrapper" style={{ height: '197px' }}>
					<div className="plot" ref={updatePlot}></div>
				</div>

				<div className="ch-plot-footer">
					<button className="btn trace pri" disabled={traceDisabled[0]} id="trace1" onClick={this._toggleTraceVisibility}>
						<span style={{background: TRACE_COLORS['PRI_DATA']}}></span>
						{primarySensor && primarySensor.unit ? primarySensor.unit : ''}
					</button>

					<div className="select-wrapper">
						<select className="icon-chevron-down" value={this.state.history} onChange={this._setHistory}>
							{historyOptions}
						</select>
					</div>

					{ !!secondarySensor && (
						<button className="btn trace sec" disabled={traceDisabled[1]} id="trace2" onClick={this._toggleTraceVisibility}>
							<span style={{background: TRACE_COLORS['SEC_DATA'] }}></span>
							{secondarySensor && secondarySensor.unit ? secondarySensor.unit : ''}
						</button>
						)
					}
				</div>
			</div>
		);
	},

	_renderAlarms: function() {

		/* 	ch.alarms = { 
				s0: {
					WARNING: [ [t0, v0], ..., null, [ tx, vx], ..., [ tn, vn ] ],
					ALARM: [ ] 
				},
				s1: {
					WARNING: [],
					ALARM: []
				},
				...,
				sN (but we only support 2 sensors for now...)
			}
		*/

		var _this = this,
			plotOptions = {},
			plotSeries = [],
			t_start = Date.now(),
			t_end = 0,
			alarms = this.state.ch.alarms;

		function tickFormatter(val, axis) {
			var digits = val > 1 ? (val > 10 ? 1 : 2) : (val < 0.1 ? 1 : 3);
			return val.toFixed(digits);
		}

		function pushDataSeries(sensorId, classification) {
			var series = [];

			if (alarms[sensorId] && alarms[sensorId][classification]) {

				alarms[sensorId][classification].forEach(function(p) {
					var t;

					if (!p) {
						series.push([ p ]); // push null to signify break in event segment
					
					} else {
						t = p[0] * 1000;
						t_start = t < t_start ? t : t_start;
						t_end = t > t_end ? t : t_end;
						series.push([ t, p[1] ]);
					}
				});

				plotSeries.push( { data: series, yaxis: sensorId == 's1' ? 2 : 1 } );
			}
		} 

		if (this.state.alarmsVisible && alarms) {

			['s0', 's1'].forEach(function(sId) {
				['WARNING', 'ALARM'].forEach(function(cls) {
					pushDataSeries(sId, cls);
				});
			});

			plotOptions = {
				xaxes: [ { 
					mode: "time",
					timezone: "browser",
					min: t_start, max: t_end,
					ticks: [ t_start, t_end ],
					timeformat: "%I:%M:%S %P",
				} ],
				yaxes: [
					{ y1Axis: { tickFormatter: tickFormatter, autoscaleMargin: 1 }}, 
					{ y2Axis: { position: 'right', tickFormatter: tickFormatter, autoscaleMargin: 1 }}
				]
			}
		}

		function updatePlot(el) {
			if (!_this.state.alarmsVisible || !_this.state.ch.alarms || !el) return;

			// generate the plot here
			var plot = $.plot($(el), plotSeries, plotOptions);
		}

		return (
			<div className={'ch-plot' + (this.state.alarmsVisible ? ' open' : '')}>

				<div className="ch-plot-header">
					<button className="btn close icon-cross" onClick={this._toggleAlarmsVisibility}></button>
					<button className="btn reset" onClick={this._clearAlarms}>Clear Alarms</button>
					<button className="btn export icon-download" onClick={this._exportHistory} />
				</div>

				<div className="plot-wrapper" style={{ height: '221px' }}>
					<div className="plot" ref={updatePlot}></div>
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
					<button className='btn' title="Hide alarm setpoints" onClick={this._toggleConfigVisibility}>&laquo;</button>

					<ThresholdConfig channel={this.props.id} sensor={primarySensor} single={!secondarySensor} />

					<ThresholdConfig channel={this.props.id} sensor={secondarySensor} />

				</div>
				<button className='btn' title='Show alarm setpoints' onClick={this._toggleConfigVisibility}>&raquo;</button>
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
			newState = { ch: Store.getState().channel_objs[this.props.id], chRequest: false }

		// read name, description into state if not currently editing them
		if (newState.ch && !this.state.activeId) {
			newState.name = newState.ch.name;				
			newState.description = newState.ch.description;
			newState.recording = newState.ch.recordAlarms;
			newState.historyOptions = Object.keys(newState.ch.rra);
		}

		this.setState(newState, function() {

			if (!_this._pollTime || !_this.state.polling) return;

			var age = moment().valueOf() - _this._pollTime,
				period = _this._pollPeriod - (age % _this._pollPeriod);

			//console.log('Updating ' + _this.state.ch.id + ' - age = ' + (age/1000) + " seconds, making request in " + period/1000 + " seconds...");

			clearTimeout(_this._pollTimeout);
			_this._pollTimeout = setTimeout(_this._startPoll, period);
		});
	},

	_startPoll: function() {
		var _this = this,
			h = this.state.historyVisible ? this.state.history : null;
		
		this._pollTime = moment().valueOf();

		this.setState({ chRequest: true }, function() {
			Actions.channel(_this.props.id, null, h, _this.state.alarmsVisible);
		});
	},

	_stopPoll: function() {
		this._pollTime = 0;
		clearTimeout(this._pollTimeout);
		this._pollTimeout = null;
	},

	_toggleConfigVisibility: function() {

		this.setState({ configOpen: !this.state.configOpen });
	},

	_togglePolling: function() {
		// PAUSE (polling = false)
		// 	Any pending channel update will run, but
		// 	will NOT trigger a new poll.
		// PLAY (polling = true)
		//	Have to call _startPoll() after the render update
		var _this = this;
		this.setState({ polling: !this.state.polling }, function () {
			if (_this.state.polling) {
				_this._startPoll()
			}
		});
	},

	_toggleRecording: function() {
		var _this = this,
			isRecording = this.state.recording;

		// fire off the channel attribute change request and update the UI state
		this.setState({ recording: !isRecording, chRequest: true }, function() {
			Actions.channel(_this.props.id, { recordAlarms: !isRecording });

		});
	},

	_toggleAlarmsVisibility: function() {
		var _this = this;
		this.setState({ alarmsVisible: !this.state.alarmsVisible }, function() {
			// trigger an update to refresh alarms if we're not polling
			if (_this.state.alarmsVisible && !_this.state.polling) {
					_this._startPoll();
			} 
		});
	},

	_toggleHistoryVisibility: function() {

		var h = this.state.history || 'live',
			_this = this;

		this.setState({ history: h, historyVisible: !this.state.historyVisible }, function () {
			if (_this.state.historyVisible) {
				// visible history - reset poll speed
				_this._pollPeriod = SLOW_POLL_PERIOD;

				// trigger a sweep if we're not already polling
				if (!_this.state.polling) {
					_this._startPoll();
				}

			} else {
				// hidden history - poll faster
				_this._pollPeriod = FAST_POLL_PERIOD;
			}
		});
	},

	_setHistory: function(e) {
		var _this = this,
			cleared_ch = assign({}, this.state.ch);

		cleared_ch.data = null;
		this.setState({ ch: cleared_ch, history: e.target.value }, function () {
			if (!_this.state.polling) {
				_this._startPoll();
			}
		});
	},

	_clearHistory: function() {
		var _this = this;

		if (confirm("Are you sure?  This action cannot be undone.")) {
			this.setState({ chRequest: true, historyVisible: false }, function() {
				Actions.deleteChannel(_this.props.id);
			});
		}
	},

	_clearAlarms: function() {
		var _this = this;

		if (confirm("Are you sure?  This action cannot be undone.")) {
			this.setState({ chRequest: true, alarmsVisible: false }, function() {
				alert("TODO:  Support this Action!"); //Actions.deleteChannel(_this.props.id);
			});
		}
	},

	_exportHistory: function() {

		Actions.exportChannel(this.props.id, this.state.history);
	},

	_toggleTraceVisibility: function (e) {

		var htv = [ !this.state.historyTraceVisible[0], this.state.historyTraceVisible[1] ];

		if (e.target.id != 'trace1') {
			htv = [ !htv[0], !htv[1] ];
		}

		this.setState({ historyTraceVisible: htv });
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
				description: this.state.ch.description,
				activeId: ''
			});
		}

		if (e.keyCode !== ENTER_KEY_CODE)
			return;

		// ENTER pressed - let blur handle update
		e.target.blur();
	},

	_onBlur: function(e) {
		var _this = this,
			v = e.target.value.trim(),
			n = e.target.name,
			obj = {};

		obj[n] = v;
		//console.log('You want to update: ', obj);

		this.setState({ activeId: '', chRequest: true }, function() {
			Actions.channel(_this.props.id, obj);
		});
	}

});

module.exports = ChannelPanel;