/**
 * HomePanel.jsx
 * james.brunner@kaelus.com
 *
 * CME status indicators site in the Home panel.
 */
var React = require('react');

var Constants = require('../Constants');
var Actions = require('../Actions');

var moment = require('moment');
var classNames = require('classnames');

var Channel = React.createClass({

	getInitialState: function() {

		return {
			configOpen: false,
			historyOpen: false
		}
	},

	render: function() {
		var contentClass = classNames({
			'ch-config': true,
			'open': this.state.configOpen
		});

		var historyClass = classNames({
			'ch-history': true,
			'open': this.state.historyOpen
		});

		var name = this.props.ch.name,
			description = this.props.ch.description,
			title = name + ": " + description;

		var primary = this.props.ch.sensors[0],
			primary_value = primary.data[primary.data.length - 1][1] || 0,

			secondary = this.props.ch.sensors[1],
			secondary_value = secondary.data[secondary.data.length - 1][1] || 0;

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

		return (
			<div className="ch">
				<div className="ch-header">
					{title}
				</div>
	
				<div className="ch-primary">
					<div className="sensor-value">
						{primary_value.toFixed(2)}
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
						{secondary_value.toFixed(1)}
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
							<input type="checkbox" />
							<span className="toggle">
							</span>
							Toggle button
						</label>	
					</div>
				</div>

				<button className="btn ch-history-badge"
						onClick={this._showHideHistory}>
					{duration}
				</button>
				<div className={historyClass}>
					<button className="btn"
							onClick={this._showHideHistory}>
						x
					</button>

					Channel History Plots

				</div>

				<div className={contentClass}>
					
					<div className='ch-config-content'>
						<button className='btn'
								onClick={this._showHideConfig}>&laquo;
						</button>

						Channel Configuration

					</div>

					<button className='btn'
							onClick={this._showHideConfig}>&raquo;
					</button>

				</div>

			</div>
		);
	},

	_showHideConfig: function() {
		this.setState({configOpen: !this.state.configOpen});
	},

	_showHideHistory: function() {
		this.setState({historyOpen: !this.state.historyOpen});
	}

})

var HomePanel = React.createClass({

	getInitialState: function () {
		return {}
	},

	componentDidMount: function() {
		Actions.poll(Constants.STATUS, Constants.START);
	},

	componentWillUnmount: function() {
		Actions.poll(Constants.STATUS, Constants.STOP);
	},

	render: function () {

		var status = this.props.status,
			channels, clock, date, time;

		if (status.channels) {
			channels = status.channels.map(function(ch){
				return <Channel key={ch.id} ch={ch} />;
			});
		}

		if (status.timestamp) {
			clock = moment.utc(status.timestamp);
			date = clock.format("MMM D");
			time = clock.format("h:mm:ss A");
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

					<div className="clock">
						<div className="date">
							{date}
						</div>
						<div className="time">
							{time}
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
window.moment = moment;

module.exports = HomePanel;