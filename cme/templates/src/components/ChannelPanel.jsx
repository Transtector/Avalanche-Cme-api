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

// flot charting requires global jQuery
window.jQuery = require('jquery');
var $ = window.jQuery; // shim for flot

var flot = require('../Flot/jquery.flot');
flot.time = require('../Flot/jquery.flot.time');

var ENTER_KEY_CODE = 13;
var ESCAPE_KEY_CODE = 27;

var FAST_POLL_PERIOD = 1000; // showing current values
var SLOW_POLL_PERIOD = 5000; // showing historic values


var	PLOT_COLORS = {
	'WARNING': '#ffd42a',
	'ALARM': '#ff2222',
	'DATA': '#eb942a',
	'GRID': '#cacaca',
	'FILL': 0.1
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
			polling: true,

			recording: false,
			alarmsVisible: false,

			history: '', // live, weekly, ... (which history is loaded)
			historyOptions: null, // list of live, weekly, ... (populates the history selection)
			historyVisible: false, // are the history plots visible
			historyPlot: 0, // which sensor history plot is active
			historyThresholdsVisible: true, // show/hide the threshold lines and shaded areas on the plots
			historyPlotAutoscale: false // scale plot to display range or autoscale
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
		var primary = this.state.ch.sensors['s0'];
		var secondary = this.state.ch.sensors['s1'];

		var ps0Class = classNames('btn', 'plot-select', {'active': this.state.historyPlot == 0 });
		var ps1Class = classNames('btn', 'plot-select', {'active': this.state.historyPlot == 1, 'hidden': !secondary });

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

					<div className={'ch-plot' + (this.state.historyVisible ? ' open' : '')}>

						<div className="ch-plot-header">
							<button className="btn close icon-cross" title='Close channel history' onClick={this._toggleHistoryVisibility}/>
							<button className="btn reset icon-trash2" title='Clear channel history' onClick={this._clearHistory}/>
							<button className="btn export icon-download2" title='Download channel history' onClick={this._exportHistory} />
						</div>

						{this._renderHistory(primary, 0)}

						{this._renderHistory(secondary, 1)}

						<div className="ch-plot-footer">
							<button className={ps0Class} id="plot_0" onClick={this._setHistoryPlot}>
								{primary && primary.unit ? primary.unit : ''}
							</button>
							<button className={ps1Class} id="plot_1" onClick={this._setHistoryPlot}>
								{secondary && secondary.unit ? secondary.unit : ''}
							</button>

							<div className="select-wrapper">
								<select className="icon-chevron-down" value={this.state.history} onChange={this._setHistory}>
									{
										this.state.historyOptions.map(function (ho) {
											return <option key={ho} value={ho}>{ho}</option>;
										})
									}
								</select>
							</div>
						</div>

					</div>

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

	_renderHistory: function(sensor, plotIndex) {

		// data[0] = [ t_start, t_end, t_step ]
		// data[1] = [ DS0, DS1, ..., DSN ]; DSx = "sx_stype_sunit" (e.g., "s0_VAC_Vrms")
		// data[2] = [ [ s0_value, s1_value, ..., sN_value ], [ s0_value, s1_value, ..., sN_value ], ... , [ s0_value, s1_value, sN_value ] ]
		// if not 'live', then data[2] is AVERAGE and there are more data...
		// data[3] is MIN 
		// data[4] is MAX.

		// flot takes data in [ [x, y] ] series arrays, so we'll generate a time, x, for every y value in data[2]
		// and we only have room for 2 sensor values for the channel (primary, secondary), so we can simplify.


		var _this = this;

		function xRange(ch_time_data) {

			return {
				start: ch_time_data[0] * 1000,
				end: ch_time_data[1] * 1000,
				step: ch_time_data[2] * 1000
			}
		}
				
		function yRange(sensor) {
			if (!sensor) return { min: 0, max: 0 }
			return {
				min: sensor.display_range[0],
				max: sensor.display_range[1]
			}
		}

		function thresholds(sensor) {

			function getSensorThreshold(s, classification, direction) {
				if (!_this.state.historyThresholdsVisible || !s || !s.thresholds || s.thresholds.length == 0) return null;

				var th = s.thresholds.find(function(th){
					return th.classification == classification && th.direction == direction;
				});

				return th && th.value;
			}

			return {
				alarm_max: getSensorThreshold(sensor, 'ALARM', 'MAX'),
				alarm_min: getSensorThreshold(sensor, 'ALARM', 'MIN'),
				warn_max: getSensorThreshold(sensor, 'WARNING', 'MAX'),
				warn_min: getSensorThreshold(sensor, 'WARNING', 'MIN')
			}
		}

		function isLive(history) {

			return history === 'live';
		}

		function dataSeries(sensor, history, data) {
			var series = [],
				traces = [ [], [], [], [], [], [], [] ],
				xrange = xRange(data[0]),
				yrange = yRange(sensor),
				ths = thresholds(sensor),
				sensor_index = parseInt(sensor.id.slice(1));

			// assemble live and consolidated data traces
			data[2].forEach(function(point, i, raw_data) {

				var x = xrange.start + xrange.step * i,
					y = point[sensor_index], // live or AVERAGE data point if not live
					ymax = data[3] ? data[3][i][sensor_index] : null,
					ymin = data[4] ? data[4][i][sensor_index] : null;


				// set series first/last threshold points
				if (i == 0 || i == raw_data.length - 1) {
					traces[0].push( [x, ths.alarm_max, yrange.max ] ); // alarm max fill up to yrange max
					traces[1].push( [x, ths.alarm_min, yrange.min ] ); // alarm min fill down to yrange min
					traces[2].push( [x, ths.warn_max, ths.alarm_max ] ); // warn max fill up to alarm max
					traces[3].push( [x, ths.warn_min, ths.alarm_min ] ); // warn min fill down to alarm min
				}

				// push the live/avg and min, max data points
				if (isLive(history)) {

					traces[4].push([ x, y ]); // live data pointnt

				} else {

					traces[4].push([ x, ymax, ymin ]); // max point fill down to min
					traces[5].push([ x, ymin ]); // min point (no fill)
					traces[6].push([ x, y ]); // avg pointnt
				}
			});

			// push data traces into flot data series
			series.push({ data: traces[0], yaxis: 1, color: PLOT_COLORS['ALARM'], lines: { fill: PLOT_COLORS['FILL'], lineWidth: 1, zero: false }, shadowSize: 0 });
			series.push({ data: traces[1], yaxis: 1, color: PLOT_COLORS['ALARM'], lines: { fill: PLOT_COLORS['FILL'], lineWidth: 1, zero: false }, shadowSize: 0 });
			series.push({ data: traces[2], yaxis: 1, color: PLOT_COLORS['WARNING'], lines: { fill: PLOT_COLORS['FILL'], lineWidth: 1, zero: false }, shadowSize: 0 });
			series.push({ data: traces[3], yaxis: 1, color: PLOT_COLORS['WARNING'], lines: { fill: PLOT_COLORS['FILL'], lineWidth: 1, zero: false }, shadowSize: 0 });
			series.push({ data: traces[4], yaxis: 1, color: PLOT_COLORS['DATA'] });
			series.push({ data: traces[5], yaxis: 1, color: PLOT_COLORS['DATA'], lines: { fill: PLOT_COLORS['FILL'], lineWidth: 1, zero: false }, shadowSize: 0 });
			series.push({ data: traces[6], yaxis: 1, color: PLOT_COLORS['DATA'], lines: { lineWidth: 1 }, shadowSize: 0 });
			series.push({ data: traces[7], yaxis: 1, color: PLOT_COLORS['DATA'], shadowSize: 0 });

			return series;
		}

		function yAxis(sensor) {
			var yrange = yRange(sensor);

			function tickFormatter(val, axis) {
				var digits = val > 1 ? (val > 10 ? 1 : 2) : (val < 0.1 ? 1 : 3);
				return val.toFixed(digits);
			}

			if (!_this.state.historyPlotAutoscale) {
				return {
					tickFormatter: tickFormatter,
					min: yrange.min,
					max: yrange.max
				}
			}

			return { tickFormatter: tickFormatter }
		}

		function plotOptions(sensor, history, data) {
			var ticks = [], tickstep,
				timeformat,
				xrange = xRange(data[0]),
				xaxis = {
					mode: 'time',
					timezone: 'browser',
					min: xrange.start,
					max: xrange.end
				};

			switch (history) {
				case 'weekly':
					tickstep = 24 * 3600 * 1000; // 1 day
					timeformat = '%a';
					break;

				default: // 'live'
					tickstep = 300 * 1000; // 5 minutes
					timeformat = '%I:%M:%S %P';
			}

			for (var t = xrange.end; t > xrange.start; t = t - tickstep) {
				ticks.push(t);
			}

			xaxis.ticks = ticks;
			xaxis.timeformat = timeformat;

			return {
				xaxes: [ xaxis ],
				yaxes: [ yAxis(sensor) ],
				grid: {
					margin: 2,
					color: PLOT_COLORS['GRID']
				}
			}
		}

		function updatePlot(el) {
			if (!sensor || !_this.state.historyVisible || !_this.state.ch.data || !el) return;

			// generate the plot here
			var plot = $.plot($(el), 
				dataSeries(sensor, _this.state.history, _this.state.ch.data), 
				plotOptions(sensor, _this.state.history, _this.state.ch.data));
		}

		var cls = classNames('plot-wrapper', { 'active': plotIndex == this.state.historyPlot });

		return (
			<div className={cls}>
				<div className='plot' ref={updatePlot}></div>

				<div className='ch-plot-tools'>
					<button title='Scale to data or display range' className='btn icon-autoscale' onClick={this._toggleHistoryPlotAutoscale} />
					<button title='Show/hide alarm thresholds' className='btn icon-thresholds' onClick={this._toggleHistoryPlotThresholds}/>
				</div>
				{
					this.state.ch.data
						? null
						: <div className={'loaderWrapper'}><div className='loader'>Loading...</div></div>
				}
			</div>
		)
	},

	_toggleHistoryPlotAutoscale: function() {

		this.setState({ historyPlotAutoscale: !this.state.historyPlotAutoscale });
	},

	_toggleHistoryPlotThresholds: function() {

		this.setState({ historyThresholdsVisible: !this.state.historyThresholdsVisible });
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
			cleared_ch = Object.assign({}, this.state.ch);

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

	_setHistoryPlot: function (e) {
		// switches between sensor plots
		var plotIndex = e.target.id.split('_')[1]; 'plot_X'
		this.setState({ historyPlot: parseInt(plotIndex) });
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

		this.setState(Object.assign({ activeId: e.target.id }, obj));
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