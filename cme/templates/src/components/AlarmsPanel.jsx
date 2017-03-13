/**
 * AlarmsPanel.jsx
 * james.brunner@kaelus.com
 *
 * CME alarms summary and presentation panel.
 */
 'use strict';

var React = require('react');

var Constants = require('../Constants');
var Actions = require('../Actions');
var Store = require('../Store');

var WeekChooser = require('./WeekChooser');

var moment = require('moment');
var classNames = require('classnames');

// application-level key press handler
var key = require('../keymaster/keymaster.js');

// hard-coded channels processed for the 
// various tables in Alarms report [ chId, sensorId ]
var CHANNEL_GROUPS = [
	[ ['ch0', 's0'], ['ch1', 's0'], ['ch2', 's0'], ['ch3', 's0'] ],
	[ ['ch4', 's0'], ['ch5', 's0'], ['ch6', 's0'], ['ch7', 's0'] ],
	[ ['ch4', 's1'], ['ch5', 's1'], ['ch6', 's1'] ]
]

var AlarmsPanel = React.createClass({

	getInitialState: function() {
		var store = Store.getState();

		return {
			config: store.config,
			device: store.device,
			channels: store.channel_objs,

			week: 0,
			weeks: [ 0, -1, -2, -3, -9, -10, -20 ],
			weekChooserOpen: false,
			alarms: false
		}
	},

	componentDidMount: function() {

		Store.addChangeListener(Constants.CONFIG, this._onStoreChange);
		Store.addChangeListener(Constants.DEVICE, this._onStoreChange);		
		Store.addChangeListener(Constants.CHANNELS, this._onStoreChange);

		// Request channels update
		Actions.channels();
	},

	componentWillUnmount: function() {

		Store.removeChangeListener(Constants.CHANNELS, this._onStoreChange);				
		Store.removeChangeListener(Constants.DEVICE, this._onStoreChange);		
		Store.removeChangeListener(Constants.CONFIG, this._onStoreChange);
	},

	render: function() {

		if (!this.state.config || !this.state.device) return null;

		// state.week holds currently displayed week with 0 = this week, -1 = last week, etc
		var weekMoment = moment().add(this.state.week, 'weeks');

		var dateFormat = 'ddd, MMMM Do h:mm a',
			startDate = weekMoment.startOf('week').format(dateFormat),
			endDate = weekMoment.endOf('week').format(dateFormat);

		// dateCode: YYYYMMDD
		var dateCode = moment(this.state.device.host.dateCode).format('MMM D YYYY');


		var powerMonitoringItems = [];
		CHANNEL_GROUPS.forEach(function(chg, i) {

			var desc = (i == 0) ? 'Source/Utility' : 'Power Conditioner';
			desc += ' ' + this.state.channels[chg[0][0]].description.split('P')[0];

			powerMonitoringItems.push(desc);

			chg.forEach(function(ch) {
				var channel = this.state.channels[ch[0]],
					sensor = channel.sensors.find(function(s) {
						return s.id == ch[1];
					});

				powerMonitoringItems.push(sensor);
			}, this);
		}, this);

		return (
			<div className="panel" id="alarms">
				<div className="panel-header">
					<div className="title">
						Alarms
					</div>

					<div className="subtitle">
						Weekly summary and detailed reports
					</div>
				</div>

				<div className="panel-content">

					<div className="content-header">
						<h2>
							Weekly Event Log:
							<span title='Click to choose other weeks' onClick={this._showWeekChooser}>
								{weekMoment.format('[Week] w, YYYY')}
							</span>
						</h2>
						<h3 className='date-range'><span>{startDate}</span> through <span>{endDate}</span></h3>
					</div>

					<h2>Site Information</h2>
					<table className='site-info'>
						<tbody>{
							this._renderSiteInfoRows({
								'Point of Contact': this.state.config.support.contact,
								'Site Code': this.state.config.general.sitecode,
								'Site Description': this.state.config.general.description,
								'Site Address': this.state.config.general.location,
								'Power Conditioner Model/SN': this.state.device.host.modelNumber + ' / ' + this.state.device.host.serialNumber,
								'Installation Date': dateCode
							})
						}</tbody>
					</table>

					<h2>Power Monitoring Summary</h2>
					<table className='power-summary'>
						<thead>
							<tr>
								<th>Channel / Sensor<br />Description</th>
								<th>Units</th>
								<th>Spec<br />Low</th>
								<th>Actual<br />Low</th>
								<th>Nominal</th>
								<th>Spec<br />High</th>
								<th>Actual<br />High</th>
								<th>Max<br />Deviation</th>
							</tr>
						</thead>
						<tbody>
							{powerMonitoringItems.map(this._renderPowerMonitoringRow)}
						</tbody>
					</table>

					<h2>Alarm Summary</h2>
					<table className='alarm-summary'>
						<thead>
							<tr><th>Alarm Event Description</th><th>Sags</th><th>Swells</th><th>Voltage<br />Imbalances</th><th>Average Event Duration</th></tr>
						</thead>
						<tbody>
							<tr><th>Source/Utility</th><td></td><td></td><td></td><td></td></tr>
							<tr><th>Power Conditioner</th><td></td><td></td><td></td><td></td></tr>
						</tbody>
					</table>

					<h2>Alarm Event Details</h2>
					<table>
						<tbody>
							<tr><th>TBD</th></tr>
						</tbody>
					</table>

					<div className='copyright'>
						<div>Core Monitoring Engine</div>
						<div>Copyright &copy; Transtector, 2017</div>
					</div>

					<WeekChooser open={this.state.weekChooserOpen} week={this.state.week} weeks={this.state.weeks} onChoice={this._hideWeekChooser} />

				</div>
			</div>
		);
	},

	_renderSiteInfoRows: function(siteInfo) {
		return Object.keys(siteInfo).map(function (k, i) {
				return (<tr key={'site-info-row_' + i}><th>{k}</th><td>{this[k]}</td></tr>);
			}, siteInfo);
	},

	_renderPowerMonitoringRow: function(pmItem, i) {
		if (typeof pmItem == 'string') {
			return (
				<tr key={'pm-summary-row_' + i} className='channel-row'><th colSpan='8'>{pmItem}</th></tr>
			)
		}

		if (pmItem.unit == '%')
			pmItem.name = 'Phase Imbalance';

		var spec_low = pmItem.thresholds.find(function(th){
			return th.classification == 'ALARM' && th.direction == 'MIN';
		});
		if (spec_low)
			spec_low = spec_low.value;
		else
			spec_low = 'n/a';

		var spec_hi = pmItem.thresholds.find(function(th){
			return th.classification == 'ALARM' && th.direction == 'MAX';
		});
		if (spec_hi)
			spec_hi = spec_hi.value;
		else
			spec_hi = 'n/a';


		return (
			<tr key={'pm-summary-row_' + i}>
				<th className='centered'>{pmItem.name}</th>
				<th>{pmItem.unit}</th>
				<td>{spec_low}</td>
				<td>act_low</td>
				<td>{pmItem.nominal}</td>
				<td>{spec_hi}</td>
				<td>act_hi</td>
				<td>max_dev</td>
			</tr>
		);
	},

	_showWeekChooser: function() {

		this.setState({ weekChooserOpen: true });
	},

	_hideWeekChooser: function(newWeek) {
		var newState = { weekChooserOpen: false };

		if (newWeek)
			newState.week = newWeek;

		this.setState(newState);
	},

	_onStoreChange: function() {
		var store = Store.getState();
		this.setState({ 
			config: store.config,
			device: store.device,
			channels: store.channel_objs
		});
	}
});

module.exports = AlarmsPanel;