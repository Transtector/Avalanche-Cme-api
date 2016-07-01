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
			historyOpen: false,
			history: null
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

		// class names for ch configuation div
		var configClass = classNames({
			'ch-config': true,
			'open': this.state.configOpen
		});

		// class names for ch history div 
		var historyClass = classNames({
			'ch-history': true,
			'open': this.state.historyOpen
		});

		// ch primary/secondary sensor display values
		var primary, secondary;

		this.state.ch.sensors.forEach(function (s) {
			if (s.id == 's0') {
				primary = s;
			} else {
				secondary = s;
			}
		});

		// Display channel time range in plain terms on the history button.
		var timestamps = [], ts_start, ts_end;

		if (this.state.ch) {
			timestamps.push(this.state.ch.first_update * 1000);
			timestamps.push(this.state.ch.last_update * 1000);
		}


		if (this.state.historyOpen && this.state.ch.data) {

			// data[0] = [ t_start, t_end, t_step ]
			// data[1] = [ DS0, DS1, ..., DSN ]; DSx = "sx_stype_sunit" (e.g., "s0_VAC_Vrms")
			// data[2] = [ [ s0_value, s1_value, ..., sN_value ], [ s0_value, s1_value, ..., sN_value ], ... , [ s0_value, s1_value, sN_value ] ]

			// flot takes data in [ [x, y] ] series arrays, so we'll generate a time, x, for every y value in data[2]
			// and we only have room for 2 sensor values for the channel (primary, secondary), so we can simplify.

			var primarySeries = [],
				secondarySeries = [];

			var t_start = this.state.ch.data[0][0] * 1000,
				t_end = this.state.ch.data[0][1] * 1000,
				t_step = this.state.ch.data[0][2] * 1000;

			//console.log("Plotting history: [ " + t_start + ", " + t_end + ", "  + t_step + " ]");

			this.state.ch.data[2].forEach(function(sensorDataValues, index) {
				var x = t_start + t_step * index,
					y1 = sensorDataValues[0],
					y2 = sensorDataValues[1]
				primarySeries.push([ x, y1 ]);
				secondarySeries.push([ x, y2 ]);
			});

			$.plot($(this._sensorsPlot()), 
				[
					{ data: primarySeries,   yaxis: 1 },
					{ data: secondarySeries, yaxis: 2 }
				],
				{
					xaxis: { 
						mode: "time",
						timezone: "browser",
						min: t_start, max: t_end,
						ticks: [ t_start, t_end ],
						timeformat: "%I:%M:%S %P",
					},
					yaxes: [ 
						{ }, 
						{
							min: 0,
							max: 1,
							alignTicksWithAxis: 1,
							position: "right"
						} 
					]
				});
		}

		ts_start = moment.utc(Math.min.apply(null, timestamps));
		ts_end = moment.utc(Math.max.apply(null, timestamps));

		var duration = ts_end.from(ts_start, true);

		// Ch errors
		if (this.state.ch) {

			var chWrapperClass = classNames({
				'ch-wrapper': true,
				'error': this.state.ch.error.length > 0
			});

			var errorMessages = null;
			if (this.state.ch.error) {
				errorMessages = this.state.ch.error.split(', ').map(function(err, i) {
					return <div key={i}>{err}</div>
				});
			}
		}

		var errorMessagesClass = classNames({
			'errors': true,
			'hidden': errorMessages == null
		});

		var history_disabled = !this.state.ch || this.state.ch.error;
		var error_title = this.state.ch ? this.state.ch.error : '';

		return (
			<div className={chWrapperClass}>
				<div className="ch">
					<div className="ch-header">
						<input type="text" id="name" name="name" 
							   value={this.state.name}
							   placeholder="name"
							   onChange={this._requestChange}
							   onKeyDown={this._onKeyDown} />
						<input type="text" id="description" name="description"
							   value={this.state.description}
							   placeholder="description"
							   onChange={this._requestChange}
							   onKeyDown={this._onKeyDown} />
					</div>

					<div className="ch-primary">
						<div className="sensor-value">
							{primary.value.toFixed(1)}
						</div>
						<div className="sensor-unit">
							<span className="U">
								{primary.unit.substr(0, 1)}
							</span>
							<span className="u">
								{primary.unit.substr(1)}
							</span>
						</div>
					</div>

					<div className="ch-secondary">
						<div className="sensor-value">
							{secondary.value.toFixed(3)}
						</div>
						<div className="sensor-unit">
							<span className="U">
								{secondary.unit.substr(0, 1)}
							</span>
							<span className="u">
								{secondary.unit.substr(1)}
							</span>
						</div>
					</div>

					{/*<div className="ch-controls">
						<div className="togglebutton">
							<label>
								<input type="checkbox"
									   id={c.id}
									   checked={cState} 
									   onChange={this._requestControlChange} />
								<span className="toggle"></span>
								{c.name}
							</label>	
						</div>
					</div>*/}
					
					<button className="btn ch-history-badge" disabled={history_disabled} onClick={this._toggleHistoryVisibility}>{duration}</button>
					<div className={historyClass}>
						<div className="ch-history-header">
							<button className="btn glyph reset" onClick={this._clearHistory}>r</button>
							<button className="btn glyph window" >o</button>
							<button className="btn glyph close" onClick={this._toggleHistoryVisibility}>x</button>
						</div>
						<div className="plot-wrapper">
							<div className="plot sensorPlot" ref="_sensorsPlot"></div>
						</div>
						<div className="ch-history-footer">
						</div>

						{/*
						<div className="plot-wrapper">
							<div className="plot controlPlot" ref="_controlsPlot"></div>
						</div>
						*/}

					</div>

					<div className={configClass}>
						<div className='ch-config-content'>
							<button className='btn'
									onClick={this._toggleConfigVisibility}>&laquo;
							</button>
							<div className='title'>Channel Configuration</div>

							<div className={errorMessagesClass}>
								<div className='title'>Errors</div>
								{errorMessages}
							</div>
						</div>

						<button className='btn' onClick={this._toggleConfigVisibility}>&raquo;</button>
					</div>
				</div>

				<div className="ch-error-badge" title={error_title}>!</div>

			</div>
		);
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

		if (this.state.historyOpen) {
			this._stopPoll();
			this._pollPeriod = FAST_POLL_PERIOD;
			this._startPoll();
		} else {
			this._pollPeriod = SLOW_POLL_PERIOD;
		}

		this.setState({ 
			history: this.state.historyOpen ? null : 'realtime',
			historyOpen: !this.state.historyOpen 
		});
	},

	_clearHistory: function() {
		if (confirm("Are you sure?  This action cannot be undone.")) {

			this.setState({ 
				history: null,
				historyOpen: false 
			});
		}
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

		this.setState(obj);
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

		var v = e.target.value.trim(),
			n = e.target.name,
			obj = {};
		obj[n] = v;

		this._chAttrInit = false;
		Actions.channel(this.props.id, obj);
	},

	_requestControlChange: function(e) {
		// control(chId, controlId, { name: name, state: state })
		Actions.control(this.props.id, e.target.id, { name: 'Toggle switch', state: e.target.checked });
	}
});

window.moment = moment;

module.exports = ChannelPanel;