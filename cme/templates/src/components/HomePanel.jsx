/**
 * HomePanel.jsx
 * james.brunner@kaelus.com
 *
 * CME status indicators site in the Home panel.
 */
 'use strict';

var React = require('react');

var Constants = require('../Constants');
var Actions = require('../Actions');

var moment = require('moment');
var classNames = require('classnames');

var utils = require('../CmeApiUtils');

var Channel = React.createClass({

	getInitialState: function() {

		return {
			configOpen: false,
			historyOpen: false
		}
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

		// ch name and description inputs
		var name = this.props.ch.name,
			description = this.props.ch.description;

		// ch primary/secondary sensor display values
		var primary = this.props.ch.sensors[0],
			primary_value = primary.data[primary.data.length - 1][1] || 0,

			secondary = this.props.ch.sensors[1],
			secondary_value = secondary.data[secondary.data.length - 1][1] || 0;

		// Calculate the range of timestamps supplied 
		// in the controls and sensors data and display
		// it in plain terms on the history button.
		var timestamps = [], ts_start, ts_end;
		this.props.ch.sensors.forEach(function(s) {
			s.data.forEach(function(p){
				timestamps.push(p[0]);
			});
		});
		this.props.ch.controls.forEach(function(c) { 
			c.data.forEach(function(p){
				timestamps.push(p[0]);
			});
		});

		ts_end = moment.unix(Math.max.apply(null, timestamps)).utc();
		ts_start = moment.unix(Math.min.apply(null, timestamps)).utc();

		var duration = ts_end.from(ts_start, true);


		// Ch controls (only 1 for now)
		var c = this.props.ch.controls[0],
			cState = c.data[c.data.length - 1][1]; // data: [[ timestamp, state ], ..., ]

		return (
			<div className="ch">
				<div className="ch-header">
					<input type="text" id="name" name="name" value={name} onChange={this._requestChange} />
					<input type="text" id="description" name="description" value={description} onChange={this._requestChange} />
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

				<button className="btn ch-history-badge"
						onClick={this._toggleHistoryVisibility}>
					{duration}
				</button>
				<div className={historyClass}>
					<button className="btn"
							onClick={this._toggleHistoryVisibility}>
						x
					</button>

					Channel History Plots

				</div>

				<div className={configClass}>
					
					<div className='ch-config-content'>
						<button className='btn'
								onClick={this._toggleConfigVisibility}>&laquo;
						</button>

						Channel Configuration

					</div>

					<button className='btn'
							onClick={this._toggleConfigVisibility}>&raquo;
					</button>

				</div>

			</div>
		);
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

		Actions.channel(this.props.ch.id, obj);
	},

	_requestControlChange: function(e) {
		// channelControl(chId, controlId, state)
		Actions.channelControl(this.props.ch.id, e.target.id, e.target.checked);
	}
});

var HomePanel = React.createClass({

	componentDidMount: function() {

		Actions.poll(Constants.START, Constants.STATUS);
	},

	componentWillUnmount: function() {

			Actions.poll(Constants.STOP, Constants.STATUS);
	},

	render: function () {

		var status = this.props.status, channels, 
			clock, date, time, timeformat, clockClasses = 'hidden',
			t = status.temperature_degC, 
			temperature, thermometerClasses = 'hidden',
			wigetsClasses = 'hidden';

		if (status.channels) {
			channels = status.channels.map(function(ch){
				return <Channel key={ch.id} ch={ch} />;
			});
		}

		if (status.timestamp) {

			clock = utils.formatRelativeMoment(
					moment.utc(status.timestamp),
					this.props.clock.displayRelativeTo,
					this.props.clock.zone
			);
			
			date = clock.format("MMM D"); // hardcoded date format (for now?)

			timeformat = this.props.clock.display12HourTime
				? this.props.clock.displayTimeFormat12Hour
				: this.props.clock.displayTimeFormat24Hour

			time = clock.format(timeformat);

			clockClasses = classNames({'clock': true })
		}

		if (t) {
			temperature = t.toFixed(1) + '°C';
			thermometerClasses = classNames({
				'thermometer': true,
				'warn': t > 40,
				'alarm': t > 60
			});
		}

		if (t || status.timestamp) {
			wigetsClasses = classNames('wigets');
		}


		return (
			<div className="panel" id="home">
				<div className="panel-header">
					<div className="title">
						Status
					</div>
					<div className="subtitle">
						CME device channels status
					</div>

					<div className={wigetsClasses}>
						<div className={clockClasses}>
							<div className="date">
								{date}
							</div>
							<div className="time">
								{time}
							</div>
						</div>

						<div className={thermometerClasses}>
							<div>
								{temperature}
							</div>
						</div>

					</div>
				</div>
				<div className="panel-content">
					{channels}
				</div>
			</div>
		);
	}
});

module.exports = HomePanel;