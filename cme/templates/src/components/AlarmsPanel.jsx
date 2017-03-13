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

var CmeAPI = require('../CmeAPI');
var $ = require('jquery');

var moment = require('moment');
var classNames = require('classnames');

// application-level key press handler
var key = require('../keymaster/keymaster.js');

function isNumeric(n) { return !isNaN(parseFloat(n)) && isFinite(n); }

function toPercentage(value, nominal, precision) {
	var precision = precision || 1; 
	if (!isNumeric(value) || !isNumeric(nominal)) return value;
	return (100 * ((parseFloat(value) / parseFloat(nominal)) - 1)).toFixed(precision); 
}

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

			powerMonitoringSummary: [],


			alarms: false
		}
	},

	componentDidMount: function() {

		Store.addChangeListener(Constants.CONFIG, this._onStoreChange);
		Store.addChangeListener(Constants.DEVICE, this._onStoreChange);		
		Store.addChangeListener(Constants.CHANNELS, this._onStoreChange);

		// Request channels update
		Actions.channels();

		// Kick off power monitoring summary
		this._powerMonitoringSummary();
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
								<th>Sensor<br />Description</th>
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
							{this.state.powerMonitoringSummary.map(this._renderPowerMonitoringRow)}
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

	_powerMonitoringSummary: function() {
		
		var _this = this,
			_pms = [];

		CHANNEL_GROUPS.forEach(function(chg, i) {

			var desc = (i == 0) ? 'Source/Utility' : 'Power Conditioner';
			desc += ' ' + this.state.channels[chg[0][0]].description.split('P')[0];

			_pms.push(desc);  // channel group description

			chg.forEach(function(ch_s, j) {
				var channel = this.state.channels[ch_s[0]],
					sensor = channel.sensors[ch_s[1]],
					index = (i * 5) + (j + 1);

				_pms.push('retrieving...'); // while we wait for results

				// request channel weekly history to populate extremes
				CmeAPI.channelHistory(channel.id, 'weekly', this.state.week + 1)
					.done(function(data){

						var MIN = data[3],
							MAX = data[4];

						sensor.act_low = Math.min.apply(null, MIN);
						sensor.act_hi = Math.max.apply(null, MAX);

						var low_dev = toPercentage(sensor.act_low, sensor.nominal),
							hi_dev = toPercentage(sensor.act_hi, sensor.nominal)

						sensor.max_dev = Math.max(low_dev, hi_dev);

						// add results back to correct row @ index
						_pms[index] = sensor;

						_this.setState({ powerMonitoringSummary: _pms });				
					});

			}, this);

		}, this);
	},

	_renderSiteInfoRows: function(siteInfo) {
		return Object.keys(siteInfo).map(function (k, i) {
				return (<tr key={'site-info-row_' + i}><th>{k}</th><td>{this[k]}</td></tr>);
			}, siteInfo);
	},

	_renderPowerMonitoringRow: function(pmItem, i) {

		// If pmItem is a string render as a full-width label for the "channel group"
		if (typeof pmItem == 'string') {
			return (
				<tr key={'pm-summary-row_' + i} className='channel-row'><th colSpan='8'>{pmItem}</th></tr>
			)
		}

		// Informational Items (plucked from sensor/threshold fields)
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
				<td>{pmItem.act_low}</td>
				<td>{pmItem.nominal}</td>
				<td>{spec_hi}</td>
				<td>{pmItem.act_hi}</td>
				<td>{pmItem.max_dev}</td>
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