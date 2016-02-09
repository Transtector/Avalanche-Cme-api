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
var PollingStore = require('../PollingStore');

var moment = require('moment');
var classNames = require('classnames');

// flot charting requires global jQuery
window.jQuery = require('jquery');
var $ = window.jQuery; // shim for flot

var flot = require('../Flot/jquery.flot');
flot.time = require('../Flot/jquery.flot.time');

var ENTER_KEY_CODE = 13;
var ESCAPE_KEY_CODE = 27;

var ChannelPanel = React.createClass({
	_chPollTimeout: null,
	_chPollPeriod: 1000,
	_chPollTime: 0,

	_chConfig: {},

	_chInitialized: false,

	getInitialState: function() {
		this._chConfig[this.props.id] = {}
		return {
			ch: null,
			name: '',
			description: '',
			configOpen: false,
			historyOpen: false
		}
	},

	componentDidMount: function() {
		// Request channel data when mounted.
		PollingStore.addChangeListener(Constants.ChangeTypes.CHANNEL, this._onChannelChange);
		this._startChPoll();
	},

	componentWillUnmount: function() {

		this._stopChPoll();
		PollingStore.removeChangeListener(Constants.ChangeTypes.CHANNEL, this._onChannelChange);		
	},

	render: function() {

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
		var primary = this.state.ch 
				? this.state.ch.sensors[0]
				: 0,

			primary_value = primary 
				? primary.data[primary.data.length - 1][1] || 0
				: 0,

			primary_unit = primary ? primary.unit : '',

			secondary = this.state.ch
				? this.state.ch.sensors[1]
				: 0,

			secondary_value = secondary
				? secondary.data[secondary.data.length - 1][1] || 0
				: 0,

			secondary_unit = secondary ? secondary.unit : '';

		// Calculate the range of timestamps supplied 
		// in the controls and sensors data and display
		// it in plain terms on the history button.
		var timestamps = [], ts_start, ts_end,
			sensorsData = [], controlsData = [];

		if (this.state.ch) {
			this.state.ch.sensors.forEach(function(s) {
				timestamps.push(s.data[0][0]*1000); // earliest sensor point
				timestamps.push(s.data[s.data.length - 1][0]*1000); // most recent sensor point		

				// Unix (seconds) to Javascript (milliseconds) timestamps for plots
				sensorsData.push(s.data.map(function(d) { return [ d[0] * 1000, d[1] ]; }));
			});

			this.state.ch.controls.forEach(function(c) { 
				// TODO: process controls for history plots
			});
		}

		var debugCurrent = moment.utc(timestamps[timestamps.length - 1]).format("MMM D H:mm:ss") + ', ' 
			+ primary_value.toFixed(1) + ', ' 
			+ secondary_value.toFixed(3);
		var debugPoints = 0;
		var debugHead = "";
		var debugTail = "";

		window.sensorsData = sensorsData;
		window.timestamps = timestamps;

		if (this.state.historyOpen) {

			$.plot($(this._sensorsPlot()), 
				[
					{ data: sensorsData[0] },
					{ data: sensorsData[1], yaxis: 2 }
				],
				{
					xaxes: [ { mode: "time" } ],
					yaxes: [ 
						{ min: 0 }, 
						{
							alignTicksWithAxis: 1,
							position: "right"
						} 
					]
				});

			debugPoints = sensorsData[0].length;
			debugTail = moment.utc(sensorsData[0][debugPoints-1][0]).format("MMM D H:mm:ss") + ', ' 
				+ sensorsData[0][debugPoints-1][1].toFixed(1) + ', ' 
				+ sensorsData[1][debugPoints-1][1].toFixed(3);
			debugHead = moment.utc(sensorsData[0][0][0]).format("MMM D H:mm:ss") + ', ' 
				+ sensorsData[0][0][1].toFixed(1) + ', ' 
				+ sensorsData[1][0][1].toFixed(3);

			//$.plot($(this._controlsPlot()), controlsData);
		}

		ts_start = moment.utc(Math.min.apply(null, timestamps));
		ts_end = moment.utc(Math.max.apply(null, timestamps));

		var duration = ts_end.from(ts_start, true);

		// Ch controls (only 1 for now, and it's hidden)
		if (this.state.ch) {
			if (this.state.ch.controls && this.state.ch.controls.length > 0) {
				var c = this.state.ch.controls[0],
					cState = c.data[c.data.length - 1][1]; // data: [[ timestamp, state ], ..., ]
			}

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
							   onChange={this._requestChange}
							   onKeyDown={this._onKeyDown} />
						<input type="text" id="description" name="description"
							   value={this.state.description}
							   onChange={this._requestChange}
							   onKeyDown={this._onKeyDown} />
					</div>

					<div className="ch-primary">
						<div className="sensor-value">
							{primary_value.toFixed(1)}
						</div>
						<div className="sensor-unit">
							<span className="U">
								{primary_unit.substr(0, 1)}
							</span>
							<span className="u">
								{primary_unit.substr(1)}
							</span>
						</div>
					</div>

					<div className="ch-secondary">
						<div className="sensor-value">
							{secondary_value.toFixed(3)}
						</div>
						<div className="sensor-unit">
							<span className="U">
								{secondary_unit.substr(0, 1)}
							</span>
							<span className="u">
								{secondary_unit.substr(1)}
							</span>
						</div>
					</div>

					{/*
					<div className="ch-controls">
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
					</div>
					*/}

					<div className="debug-info">
						<div>Current: {debugCurrent}</div>
						<div>Points: {debugPoints}</div>
						<div>Head: {debugHead}</div>
						<div>Tail: {debugTail}</div>
					</div>

					<button className="btn ch-history-badge" disabled={history_disabled} onClick={this._toggleHistoryVisibility}>{duration}</button>
					<div className={historyClass}>
						<div className="plot-wrapper">
							<div className="plot sensorPlot" ref="_sensorsPlot"></div>
						</div>
						{/*
						<div className="plot-wrapper">
							<div className="plot controlPlot" ref="_controlsPlot"></div>
						</div>
						*/}

						<button className="btn glyph_close" onClick={this._toggleHistoryVisibility}>X</button>
						<button className="btn glyph_reset" onClick={this._clearHistory}>R</button>
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
			newState = {
				ch: PollingStore.getState().channel_objs[this.props.id]
			}

		if (newState.ch && newState.ch.reset) {
			delete this._chConfig[this.props.id]['reset'];
		}

		if (this._chInitialized && newState.ch) {
			newState.name = newState.ch.name,
			newState.description = newState.ch.description
		}

		this._chInitialized = true;

		this.setState(newState, function () {

			if (!_this._chPollTime) return;

			var age = moment().valueOf() - _this._chPollTime,
				period = _this._chPollPeriod - (age % _this._chPollPeriod);

			//console.log('Updating ' + _this.state.ch.id + ' - age = ' + (age/1000) + " seconds, making request in " + period/1000 + " seconds...");

			clearTimeout(_this._chPollTimeout);
			_this._chPollTimeout = setTimeout(function () {

				if (_this.state.historyOpen)
					_this._chConfig[_this.props.id]['expand'] = true;
				else
					if (_this._chConfig && _this._chConfig[_this.props.id])
						delete _this._chConfig[_this.props.id]['expand'];

				_this._chPollTime = moment().valueOf();
				Actions.channel(_this.props.id, _this._chConfig[_this.props.id] || {});
			}, period);

		});
	},

	_startChPoll: function() {

		this._chPollTime = moment().valueOf();
		Actions.channel(this.props.id, this._chConfig[this.props.id]);
	},

	_stopChPoll: function() {
		this._chPollTime = 0;
		clearTimeout(this._chPollTimeout);
		this._chPollTimeout = null;
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
			this._stopChPoll();
			this._startChPoll();
		}

		this.setState({ historyOpen: !this.state.historyOpen });
	},

	_clearHistory: function() {
		if (confirm("Are you sure?  This action cannot be undone.")) {
			this._chConfig[this.props.id]['reset'] = true;
			this.setState({ historyOpen: false });
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

		Actions.channel(this.props.id, obj);
	},

	_requestControlChange: function(e) {
		// control(chId, controlId, { name: name, state: state })
		Actions.control(this.props.id, e.target.id, { name: 'Toggle switch', state: e.target.checked });
	}
});
window.moment = moment;

module.exports = ChannelPanel;