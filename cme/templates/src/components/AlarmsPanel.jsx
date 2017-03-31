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

// flot charting requires global jQuery
window.jQuery = require('jquery');
var $ = window.jQuery;

// Date/time/duration calculations and formatting
var moment = require('moment');
require('moment-duration-format');

var classNames = require('classnames');

// application-level key press handler
var key = require('../keymaster/keymaster.js');

var flot = require('../Flot/jquery.flot');

function isNumeric(n) { return !isNaN(parseFloat(n)) && isFinite(n); }

function toPercentage(value, nominal) {
	if (!isNumeric(value) || !isNumeric(nominal)) return value;
	if (!nominal) return parseFloat(value);

	return (100 * ((parseFloat(value) / parseFloat(nominal)) - 1)); 
}

// These channels must be available to process this report
var CHANNELS = ['ch0', 'ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6', 'ch7'];

// These are grouped according to channel, sensor for 
// processing the Power Monitoring Summary.
var CHANNEL_GROUPS = [
	[ ['ch0', 's0'], ['ch1', 's0'], ['ch2', 's0'], ['ch3', 's0'] ],
	[ ['ch4', 's0'], ['ch5', 's0'], ['ch6', 's0'], ['ch7', 's0'] ],
	[ ['ch4', 's1'], ['ch5', 's1'], ['ch6', 's1'] ]
]

// These are grouped according to channels processed for the
// Alarms Summary.
var ALARM_GROUPS = [ {
		name: 'Source/Utility',
		channels: ['ch0', 'ch1', 'ch2', 'ch3']
	},{
		name: 'Power Conditioner', 
		channels: ['ch4', 'ch5', 'ch6', 'ch7'] 
	}
]


var	PLOT_COLORS = {
	'VA': '#ff0000',
	'VB': '#00ff00',
	'VC': '#0000ff',
	'PIB': '#ffd42a',
	'GRID': '#cacaca',
	'FILL': 0.1
}

var AlarmsPanel = React.createClass({

	getInitialState: function() {
		var store = Store.getState();

		return {
			config: store.config,
			device: store.device,
			channels: store.channel_objs,

			week: 0, // current week; past weeks go back in negative integers (-1 = last week, -2 = two weeks ago, ...)
			weeks: [ 0 ], // weeks available to load into week
			historyStart: 0, // the oldest time we started recording (channel w/oldest history start time)
			weekChooserOpen: false,

			powerMonitoringSummary: [],
			alarmSummary: [],
			alarms: []
		}
	},

	componentDidMount: function() {

		Store.addChangeListener(Constants.CONFIG, this._onStoreChange);
		Store.addChangeListener(Constants.DEVICE, this._onStoreChange);

		CHANNELS.forEach(function(chId) {

			// listen for changes to the channel
			Store.addChangeListener(Constants.CHANNEL + chId.toUpperCase(), this._onChannelChange);

			// if not found - fire a request
			if (!this.state.channels[chId]) {
				Actions.channel(chId, null, null); // this will update the Store.channel_objs
			}
		}, this);


		// CLEAR/LOAD a batch of FAKE Alarms
		var _this = this;
		CmeAPI.fakeAlarms()
			.done(function(data) {

				alert(data);

				// trigger the power monitoring summary build
				_this._updatePowerMonitoring();

				// load the available weeks to enable the week chooser
				_this._updateHistoryWeeks();

				// load alarms for the week
				_this._updateAlarms();
			});

	},

	componentWillUnmount: function() {

		CHANNELS.forEach(function(chId) {
			Store.removeChangeListener(Constants.CHANNEL + chId.toUpperCase(), this._onChannelChange);
		}, this);

		Store.removeChangeListener(Constants.DEVICE, this._onStoreChange);		
		Store.removeChangeListener(Constants.CONFIG, this._onStoreChange);
	},

	render: function() {

		if (!Object.keys(this.state.config).length || !Object.keys(this.state.device).length) return null;

		var dateFormat = 'ddd, MMMM Do h:mm a',

			startDate = this.state.week == this.state.weeks[0]

				// we're displaying the current week - check if the start of the week is after the historyStart
				? moment().startOf('week').isAfter(moment(this.state.historyStart))
					
					// If yes, startDate is beginning of current week
					? moment().startOf('week')

					// If no, startDate is the historyStart
					: moment(this.state.historyStart) 

				// we're not displaying the current week - see if we're displaying
				// the last available week
				: this.state.week == this.state.weeks[this.state.weeks.length - 1]

					// if yes, startDate is the historyStart
					? moment(this.state.historyStart)

					// else startDate gets the start of the displayed week (Sunday)
					: moment().startOf('week').add(this.state.week, 'weeks'),

			// endDate is either the end of startDate's week, or if we're on the current
			// week, then endDate is right now.
			endDate = this.state.week != this.state.weeks[0] 
				? moment(startDate).endOf('week') 
				: moment();

		// dateCode: YYYYMMDD
		var cmeOrHost = this.state.device.host || this.state.device.cme;
		var dateCode = moment(cmeOrHost.dateCode).format('MMM D YYYY');

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
							<button title='Click to choose other weeks' onClick={this._showWeekChooser} disabled={this.state.weeks.length < 2}>
								{startDate.format('[Week] w, YYYY')}
							</button>
						</h2>
						<h3 className='date-range'><span>{startDate.format(dateFormat)}</span> through <span>{endDate.format(dateFormat)}</span></h3>
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
							<tr>
								<th>Alarm Event Description</th>
								<th>Outages</th>
								<th>Sags</th>
								<th>Swells</th>
								<th>Voltage<br />Imbalances</th>
								<th>Average<br />Event Duration</th>
							</tr>
						</thead>
						<tbody>
							{this.state.alarmSummary.map(this._renderAlarmSummaryRow)}
						</tbody>
					</table>

					<h2 className='alarm-detail'>Alarm Details</h2>
					{this.state.alarms.map(this._renderAlarmDetailTable)}


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

	_updatePowerMonitoring: function() {
		
		var _this = this,
			_pms = [];

		if (!this._channelsReady()) return;

		// console.log('Processing power monitoring summary...');

		CHANNEL_GROUPS.forEach(function(chg, i) {

			var NA = '--',
				desc = (i == 0) ? 'Source/Utility' : 'Power Conditioner';

			if (!this.state.channels[chg[0][0]]) return;

			desc += ' ' + this.state.channels[chg[0][0]].description.split('P')[0];

			_pms.push(desc);  // channel group description

			chg.forEach(function(ch_s, j) {
				var channel = this.state.channels[ch_s[0]],
					sensor = channel.sensors[ch_s[1]],
					index = (i * 5) + (j + 1);


				var spec_low = sensor.thresholds.find(function(th){
					return th.classification == 'ALARM' && th.direction == 'MIN';
				});
		
				if (spec_low)
					spec_low = spec_low.value.toFixed(1);
				else
					spec_low = NA;

				var spec_hi = sensor.thresholds.find(function(th){
					return th.classification == 'ALARM' && th.direction == 'MAX';
				});
				if (spec_hi)
					spec_hi = spec_hi.value.toFixed(1);
				else
					spec_hi = NA;


				sensor.spec_low = spec_low;
				sensor.spec_hi = spec_hi;

				_pms.push('retrieving...'); // while we wait for results

				// request channel weekly history to populate extremes
				var start = this.state.week

					// If we're NOT in the current week (this.state.week == 0) then
					// we'll set start to the days difference between now and
					// this.state.week X Sundays ago.
					? moment().diff(moment().day(7 * this.state.week), 'days')

					// Else, we'll just go back to Sunday
					: moment().diff(moment().day(0), 'days');

				var end = this.state.week
					? start + 7 // start + 7 days
					: 0; // else end now

				var history = {
					h: 'weekly', // block size is days
					s: start, // start this many days ago
					e: end // end this many days after start (or 0 = now)
				}

				CmeAPI.sensorHistory(channel.id, sensor.id, history)
					.done(function(data) {

						var MIN = data[3].filter(isNumeric),
							MAX = data[4].filter(isNumeric);

						var act_low = (MIN.length > 0) 
								? Math.min.apply(null, MIN)
								: NA;

						var act_hi = (MAX.length > 0)
								? Math.max.apply(null, MAX)
								: NA;

						var low_dev = (sensor.spec_low != NA) 
								? (act_low < sensor.nominal) 
									? toPercentage(act_low, sensor.nominal) 
									: NA 
								: NA;

						var hi_dev = (sensor.spec_hi != NA) 
								? (act_hi > sensor.nominal) 
									? toPercentage(act_hi, sensor.nominal) 
									: NA
								: NA;

						var max_dev = (low_dev != NA && hi_dev != NA) 
								? Math.max(low_dev, hi_dev) 
								: (low_dev != NA)
									? low_dev 
									: hi_dev;

						// ignore max_dev if both sensor actual high and low are 0 (or null)
						if (act_hi == 0 && act_low == 0) {
							max_dev = NA;
						}

						// TODO: toFixed() truncates the numbers displayed (not rouned).
						// Add a proper rounding routine that rounds at the desired precision.
						function format(value, suffix) {
							if (!isNumeric(value)) return value;

							var value = parseFloat(value),
								suffix = suffix || '';

							if (Math.abs(value) < 3) {
								if (Math.abs(value) < 2) {
									return value.toFixed(2) + suffix;
								} else {
									return value.toFixed(1) + suffix;
								}
							} else {
								return value.toFixed(0) + suffix;
							}
						}

						sensor.act_hi = format(act_hi);
						sensor.act_low = format(act_low);
						sensor.low_dev = format(low_dev, ' %');
						sensor.hi_dev = format(hi_dev, ' %');
						sensor.max_dev = format(max_dev, ' %');

						// add results back to correct row @ index
						_pms[index] = sensor;

						_this.setState({ powerMonitoringSummary: _pms });				
					});
			}, this);
		}, this);
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

		return (
			<tr key={'pm-summary-row_' + i}>
				<th className='centered'>{pmItem.name}</th>
				<td>{pmItem.unit}</td>
				<td>{pmItem.spec_low}</td>
				<td>{pmItem.act_low}</td>
				<td>{pmItem.nominal}</td>
				<td>{pmItem.spec_hi}</td>
				<td>{pmItem.act_hi}</td>
				<td>{pmItem.max_dev}</td>
			</tr>
		);
	},

	_channelsReady: function() {
		// confirm all required channels are present, otherwise, return null
		return CHANNELS.every(function(chId) {
			return !!this.state.channels[chId];
		}, this);
	},

	_updateHistoryWeeks: function() {
		
		if (!this._channelsReady()) return;

		// All channels available here - get all channels' first_update timestamp
		var historyStart = Object.values(this.state.channels).map(function(ch){
			return ch.first_update * 1000;
		});

		// The channel with the longest history has the smallest first_update timestamp
		historyStart = Math.min.apply(null, historyStart);

		// history_days will hold the number of days of history for the oldest
		// channel recorded.  For example, say there are 12 days of channel history
		// for the oldest channel.  They are made up of 2 days in current week,
		// 7 days in last (full) week, and 3 days in the week the history was started.
		// So, for our example,
		//
		// 		history_days = 12
		//
		var history_days = moment().diff(historyStart, 'days');

		// We want to build our weeks array of negative numbers of weeks of history.  We
		// include this (partial) week as week 0, every full week before the start of this
		// week, and the possible partial week when the channel history was started.
		var weeks = [];

		// For every full  week floor (days / 7) plus this week, add an entry
		// In our example,
		//
		//		i = 0 to 1; where Math.floor(12 / 7) = 1
		//
		// and [0, -1] will be pushed to the weeks array (this week, last week).
		//
		var current_week_days = moment().diff(moment().startOf('week'), 'days');

		for (var i = 0; i <= Math.floor( (history_days - current_week_days) / 7); i++) {
			weeks.push(-i);
		}

		// Finally, we have to account for any partial week that the channel history
		// started.  We can check if there are partial days left by subtracting the
		// current week's days and taking the modulus of what's left by 7 (days in a week).
		//
		// In our example, it's a Tuesday, and there are 2 days since the start of this week
		// so current_week_days = 2.  And we can then calculate the partial start days as:
		//
		//		(12 - 2) % 7 = 3
		//
		// So we push one additional history week to handle the 3 days in that first week.
		// Note that the iterator variable, i, should be sitting at the next value.
		//
		if ( (history_days - current_week_days) % 7) {
			weeks.push(-i);
		}

		this.setState({ weeks: weeks, historyStart: historyStart });
	},

	_updateAlarms: function() {
		var _this = this,
			_as = [],
			_alarms = [];

		if (!this._channelsReady()) return;		

		ALARM_GROUPS.forEach(function(ag) {
			
			var alarmSummaryItem = { 
				name: ag.name, 
				outages: 0, 
				sags: 0,
				swells: 0,
				imbalances: 0,
				avg_duration: 0
			}

			_as.push(alarmSummaryItem);

			CmeAPI.alarms({c: ag.channels.join(','), s: null, e: null})
				.done(function(group_alarms) {

					var duration = 0,
						alarms_with_end = 0;

					//console.log("ALARMS received: " + group_alarms);

					group_alarms.forEach(function(a) {

						switch(a.type.toUpperCase()) {
							case 'OUTAGE':
								alarmSummaryItem.outages = alarmSummaryItem.outages + 1;
								break;

							case 'SWELL':
								alarmSummaryItem.swells = alarmSummaryItem.swells + 1;
								break;

							case 'SAG':
								alarmSummaryItem.sags = alarmSummaryItem.sags + 1;
								break;

							case 'IMBALANCE':
								alarmSummaryItem.imbalances = alarmSummaryItem.imbalances + 1;
								break;

							default:
								alarmSummaryItem.outages = alarmSummaryItem.outages + 1;
								break;
						}

						if (a.end) {
							alarms_with_end += 1;
							duration += a.end - a.start;
						}

						_alarms.push(Object.assign({ group: ag.name }, a));
					});

					if (alarms_with_end) {
						alarmSummaryItem.avg_duration = duration / alarms_with_end;
					}

					_this.setState({ alarmSummary: _as, alarms: _alarms });
				});
		}, this);
	},

	_renderAlarmSummaryRow: function(alarmSummary, i) {

		return (
			<tr key={'alarm-summary-row_' + i}>
				<th>{alarmSummary.name}</th>
				<td>{alarmSummary.outages ? alarmSummary.outages : '--'}</td>
				<td>{alarmSummary.sags ? alarmSummary.sags : '--'}</td>
				<td>{alarmSummary.swells ? alarmSummary.swells : '--'}</td>
				<td>{alarmSummary.imbalances ? alarmSummary.imbalances : '--'}</td>
				<td>{alarmSummary.avg_duration ? moment.duration(alarmSummary.avg_duration).humanize() : '--'}</td>
			</tr>
		);
	},

	_renderAlarmDetailTable: function(alarm, i) {

		var dateFormat = 'ddd, MMM D h:mm:ss.SSS a',
			duration = alarm.end_ms ? moment.duration(alarm.end_ms - alarm.start_ms) : null;

		return (
			<table key={'alarm-detail-table_' + i} className='alarm-detail'>
				<tbody>
					<tr>
						<th className='alarm-group' colSpan='4'>{alarm.group}</th>
					</tr>
					<tr>
						<th>Trigger</th><td>{alarm.channel + ' ' + alarm.sensor}</td>
						<th>Type</th><td>{alarm.type}</td>
					</tr>
					<tr>
						<th>Start</th><td>{moment(alarm.start_ms).format(dateFormat)}</td>
						<th>End</th><td>{alarm.end_ms ? moment(alarm.end_ms).format(dateFormat) : '--'}</td>
					</tr>
					<tr>
						<th>Duration</th><td>{duration ? duration.format('h:mm:ss.SSS') + ' (' + duration.humanize() + ')' : '--'}</td>
						<td colSpan='2'></td>
					</tr>
					<tr><td className='plots' colSpan='4'>{this._renderAlarmPlots(alarm)}</td></tr>
				</tbody>
			</table>
		);
	},

	_renderAlarmPlots: function(alarm) {
		var _this = this;
				
		function dataSeries(a) {
			var series = [],
				traces = [ [], [], [], [] ],

				N = a.data.ch0.s0.length,

				start = -N * a.step_ms,
				step = a.step_ms;

			// assemble live and consolidated data traces
			alarm.data['ch0']['s0'].forEach(function(y, i) {

				var t = 1000 * (start + step * i);

				traces[0].push([ t, alarm.data['ch3']['s0'][i] ]);

				traces[1].push([ t, y ]);
				traces[2].push([ t, alarm.data['ch1']['s0'][i] ]);
				traces[3].push([ t, alarm.data['ch2']['s0'][i] ]);
			});

			// push data traces into flot data series
			series.push({ data: traces[0], yaxis: 2, color: PLOT_COLORS['PIB'], lines: { lineWidth: 1 }, shadowSize: 0 });
			series.push({ data: traces[1], yaxis: 1, color: PLOT_COLORS['VA'] });
			series.push({ data: traces[2], yaxis: 1, color: PLOT_COLORS['VB'] });
			series.push({ data: traces[3], yaxis: 1, color: PLOT_COLORS['VC'] });

			//series.push({ data: traces[3], yaxis: 1, color: PLOT_COLORS['WARNING'], lines: { fill: PLOT_COLORS['FILL'], lineWidth: 1, zero: false }, shadowSize: 0 });
			//series.push({ data: traces[4], yaxis: 1, color: PLOT_COLORS['DATA'] });
			//series.push({ data: traces[5], yaxis: 1, color: PLOT_COLORS['DATA'], lines: { fill: PLOT_COLORS['FILL'], lineWidth: 1, zero: false }, shadowSize: 0 });
			//series.push({ data: traces[6], yaxis: 1, color: PLOT_COLORS['DATA'], lines: { lineWidth: 1 }, shadowSize: 0 });

			return series;
		}
		
		function plotOptions(data) {

			return {
				yaxes: [ {}, { 
					alignTicksWithAxis: 1,
					position: 'right'
				}],
				grid: {
					margin: 2,
					backgroundColor: { colors: [ "#fff", "#eee" ] },
					color: PLOT_COLORS['GRID']
				}
			}
		}

		function updatePlot(el) {
			if (!alarm || !alarm.data || !el) return;

			// generate the plot here
			var plot = $.plot($(el), dataSeries(alarm), plotOptions());
		}

		function renderLegend() {
			return (
				<table className='legend'><tbody>
					<tr>
						<td className='ph-A'>Va</td>
						<td className='ph-B'>Vb</td>
						<td className='ph-C'>Vc</td>
						<td className='pib'>Phs. Imb.</td>
					</tr>
				</tbody></table>
			);
		}

		var cls = classNames('plot-wrapper', { 'active': false });

		return (
			<div className={cls}>
				{renderLegend()}

				<div className='plot' ref={updatePlot}></div>

				<div className='x-axis-label'>Time To Alarm (ms) <span>{moment(alarm.start_ms).format("h:mm:ss.SSS a")}</span></div>
				<div className='y-axis-label left'>Phase Voltage (V)</div>
				<div className='y-axis-label right'>Phase Imbalance (%)</div>
				{
					alarm.data
						? null
						: <div className={'loaderWrapper'}><div className='loader'>Loading...</div></div>
				}
			</div>
		)
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
			device: store.device
		});
	},

	_onChannelChange: function() {
		// update the state channels and kick off power monitoring summary.
		this.setState({ channels: Store.getState().channel_objs }, function() {
			this._updatePowerMonitoring();
			this._updateHistoryWeeks();
			this._updateAlarms();
		});
	}
});

window.moment = moment;
module.exports = AlarmsPanel;