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

var Scb = React.createClass({

	getInitialState: function() {

		return {
			configOpen: false,
			historyOpen: false
		}
	},

	render: function() {
		var contentClass = classNames({
			'scb-config': true,
			'open': this.state.configOpen
		});

		var historyClass = classNames({
			'scb-history': true,
			'open': this.state.historyOpen
		});

		var end = moment.utc(this.props.data.timestamp),
			start = moment.utc(this.props.data.timestamp_0),
			duration = end.from(start, true);


		return (
			<div className="scb">
				<div className="scb-header">
					{this.props.data.name + ": " + this.props.data.description}
				</div>
	
				<div className="scb-primary">
					<div className="sensor-value">
						{this.props.data.sensors[0].value.toFixed(2)}
					</div>
					<div className="sensor-unit">
						<span className="U">
							{this.props.data.sensors[0].unit.substr(0, 1)}
						</span>
						<span className="u">
							{this.props.data.sensors[0].unit.substr(1)}
						</span>
					</div>
				</div>

				<div className="scb-secondary">
					<div className="sensor-value">
						{this.props.data.sensors[1].value.toFixed(1)}
					</div>
					<div className="sensor-unit">
						<span className="U">
							{this.props.data.sensors[1].unit.substr(0, 1)}
						</span>
						<span className="u">
							{this.props.data.sensors[1].unit.substr(1)}
						</span>
					</div>
				</div>

				<div className="scb-controls">

				</div>

				<button className="btn scb-history-badge"
						onClick={this._showHideHistory}>
					{duration}
				</button>
				<div className={historyClass}>
					<button className="btn"
							onClick={this._showHideHistory}>
						x
					</button>

					History Plot

				</div>

				<div className={contentClass}>
					
					<div className='scb-config-content'>
						<button className='btn'
								onClick={this._showHideConfig}>&laquo;
						</button>

						Sensor Control Block Configuration

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
			scbs, clock, date, time;

		if (status.scbs) {
			scbs = status.scbs.map(function(scb){
				return <Scb key={scb.id} data={scb} />;
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
						CME device sensor control blocks
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
					{scbs}
				</div>
			</div>
		);
	}
});

module.exports = HomePanel;