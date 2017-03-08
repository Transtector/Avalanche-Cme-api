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

var moment = require('moment');
var classNames = require('classnames');
var utils = require('../CmeApiUtils');

// application-level key press handler
var key = require('../keymaster/keymaster.js');

var AlarmsPanel = React.createClass({

	getInitialState: function() {
		return {
			config: Store.getState().config,
			device: Store.getState().device,
			alarms: false
		}
	},

	componentDidMount: function() {

		Store.addChangeListener(Constants.CONFIG, this._onConfigChange);
	},

	componentWillUnmount: function() {

		Store.removeChangeListener(Constants.CONFIG, this._onConfigChange);
	},

	render: function() {

		if (!this.state.config || !this.state.device) return null;

		var dateFormat = 'ddd, MMM Do YYYY, h:mm A',
			startDate = moment().startOf('week').format(dateFormat),
			endDate = moment().endOf('week').format(dateFormat);

		return (
			<div className="panel" id="alarms">
				<div className="panel-header">
					<div className="title">
						Alarms
					</div>

					<div className="subtitle">
						Weekly summmary and detailed reports
					</div>
				</div>

				<div className="panel-content">

					<h2>Weekly Event Log</h2>
					<h3>{startDate} through {endDate}</h3>

					<h2>Site Information</h2>
					<table className='site-info'>
						<tbody>{
							this._renderSiteInfoRows({
								'Point of Contact': this.state.config.support.contact,
								'Site Code': '(new) "site code" field',
								'Site Description': this.state.config.general.description,
								'Site Address': this.state.config.general.location,
								'Power Conditioner Model/SN': this.state.device.host.modelNumber + '/' + this.state.device.host.serialNumber,
								'Installation Date': this.state.device.host.dateCode
							})
						}</tbody>
					</table>

					<h2>Power Monitoring Summary</h2>
					<table className='power-summary'>
						<thead>
							<tr>
								<th>Sensor Description</th>
								<th>Spec<br />Low</th>
								<th>Actual<br />Low</th>
								<th>Nominal</th>
								<th>Spec<br />High</th>
								<th>Actual<br />High</th>
								<th>Max<br />Deviation</th>
							</tr>
						</thead>
						<tbody>{[
								['ch0', 's0'], ['ch1', 's0'], ['ch2', 's0'], ['ch3', 's0'],
								['ch4', 's0'], ['ch5', 's0'], ['ch6', 's0'], ['ch7', 's0'],
								['ch4', 's1'], ['ch5', 's1'], ['ch6', 's1']
								].map(this._renderPowerMonitoringSummaryRow)
						}</tbody>
					</table>

					<h2>Alarm Summary</h2>
					<table className='alarm-summary'>
						<thead>
							<tr><th>Alarm Event Description</th><th>Sags</th><th>Swells</th><th>Voltage<br />Imbalances</th><th>Average Event Duration</th></tr>
						</thead>
						<tbody>
							<tr><th>Source/Utility Service</th><td></td><td></td><td></td><td></td></tr>
							<tr><th>Power Conditioner Service</th><td></td><td></td><td></td><td></td></tr>
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
				</div>
			</div>
		);
	},

	_renderSiteInfoRows: function(siteInfo) {
		return Object.keys(siteInfo).map(function (k, i) {
				return (<tr key={'site-info-row_' + i}><th>{k}</th><td>{this[k]}</td></tr>);
			}, siteInfo);
	},

	_renderPowerMonitoringSummaryRow: function(ch_sensor, i) {
		var ch = ch_sensor[0],
			s = ch_sensor[1];

		return (
			<tr key={'pm-summary-row_' + i}>
				<th>{ch + '_' + s + ' description'}</th>
				<td>spec_low</td>
				<td>act_low</td>
				<td>nominal</td>
				<td>spec_hi</td>
				<td>act_hi</td>
				<td>max_dev</td>
			</tr>
		);
	},

	_onConfigChange: function() {

		this.setState({ config: Store.getState().config });
	}
});

module.exports = AlarmsPanel;