/**
 * ChannelPanel.jsx
 * james.brunner@kaelus.com
 *
 * CME generic channel panel component.
 */
 'use strict';

var React = require('react');

var Actions = require('../Actions');

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
	_chPollInterval: null,
	_chPollPeriod: 2000,

	getInitialState: function() {

		return {
			name: this.props.ch.name,
			description: this.props.ch.description,
			configOpen: false,
			historyOpen: false
		}
	},

	componentDidMount: function() {
		
		this._startChPoll();
	},

	componentWillUnmount: function() {

		this._stopChPoll();
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
		var primary = this.props.ch.sensors[0],
			primary_value = primary.data[primary.data.length - 1][1] || 0,

			secondary = this.props.ch.sensors[1],
			secondary_value = secondary.data[secondary.data.length - 1][1] || 0;

		// Calculate the range of timestamps supplied 
		// in the controls and sensors data and display
		// it in plain terms on the history button.
		var timestamps = [], ts_start, ts_end,
			sensorsData = [], controlsData = [];

		this.props.ch.sensors.forEach(function(s) {
			timestamps.push(s.data[0][0]); // earliest sensor point
			timestamps.push(s.data[s.data.length - 1][0]); // most recent sensor point		

			// Unix (seconds) to Javascript (milliseconds) timestamps for plots
			sensorsData.push(s.data.map(function(d) { return [ d[0] * 1000, d[1] ]; }));
		});

		this.props.ch.controls.forEach(function(c) { 
			// TODO: process controls for history plots
		});

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

			//$.plot($(this._controlsPlot()), controlsData);
		}

		ts_start = moment.unix(Math.min.apply(null, timestamps)).utc();
		ts_end = moment.unix(Math.max.apply(null, timestamps)).utc();

		var duration = ts_end.from(ts_start, true);

		// Ch controls (only 1 for now, and it's hidden)
		if (this.props.ch.controls && this.props.ch.controls.length > 0) {
			var c = this.props.ch.controls[0],
				cState = c.data[c.data.length - 1][1]; // data: [[ timestamp, state ], ..., ]
		}

		var chWrapperClass = classNames({
			'ch-wrapper': true,
			'error': this.props.ch.error.length > 0
		});

		var errorMessages = null;
		if (this.props.ch.error) {
			errorMessages = this.props.ch.error.split(', ').map(function(err, i) {
				return <div key={i}>{err}</div>
			});
		}

		var errorMessagesClass = classNames({
			'errors': true,
			'hidden': errorMessages == null
		});


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
								{primary.unit.substr(0, 1)}
							</span>
							<span className="u">
								{primary.unit.substr(1)}
							</span>
						</div>
					</div>

					<div className="ch-secondary">
						<div className="sensor-value">
							{secondary_value.toFixed(3)}
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

					<button className="btn ch-history-badge" disabled={this.props.ch.error} onClick={this._toggleHistoryVisibility}>{duration}</button>
					<div className={historyClass}>
						<div className="plot-wrapper">
							<div className="plot sensorPlot" ref="_sensorsPlot"></div>
						</div>
						{/*
						<div className="plot-wrapper">
							<div className="plot controlPlot" ref="_controlsPlot"></div>
						</div>
						*/}
						<button className="btn" onClick={this._toggleHistoryVisibility}>x</button>
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

				<div className="ch-error-badge" title={this.props.ch.error}>!</div>

			</div>
		);
	},

	_startChPoll: function() {
		var _this = this;
		function pollChannel() {
			Actions.channel(_this.props.ch.id);
		}

		if (!this._chPollInterval) {
			this._chPollInterval = setInterval(pollChannel, this._chPollPeriod);
		}
	},

	_stopClockPoll: function() {

		clearInterval(this._chPollInterval);
		this._chPollInterval = null;
	},

	_sensorsPlot: function() {

		return this.refs["_sensorsPlot"];
	},

	_controlsPlot: function() {

		return this.refs["_controlsPlot"];
	},

	_toggleConfigVisibility: function() {

		this.setState({configOpen: !this.state.configOpen});
	},

	_toggleHistoryVisibility: function() {

		this.setState({historyOpen: !this.state.historyOpen});
	},

	_requestChange: function(e) {
		var v = e.target.value,
			n = e.target.name,
			obj = {};
		obj[n] = v;

		this.setState(obj);
	},

	_onKeyDown: function(e) {
		if (e.keyCode === ESCAPE_KEY_CODE) {
			this.setState({
				name: this.props.ch.name,
				description: this.props.ch.description
			});
		}

		if (e.keyCode !== ENTER_KEY_CODE)
			return;

		var v = e.target.value.trim(),
			n = e.target.name,
			obj = {};
		obj[n] = v;

		Actions.channel(this.props.ch.id, obj);
	},

	_requestControlChange: function(e) {
		// control(chId, controlId, { name: name, state: state })
		Actions.control(this.props.ch.id, e.target.id, { name: 'Toggle switch', state: e.target.checked });
	}
});

module.exports = ChannelPanel;