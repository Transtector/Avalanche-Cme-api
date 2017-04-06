/**
 * AlarmDetailTable.jsx
 * james.brunner@kaelus.com
 *
 * Relatively complex table-based UI to give CME alarm details and (flot) waveform plots.
 */
'use strict';

var React = require('react');

var classNames = require('classnames');

// Date/time/duration calculations and formatting
var moment = require('moment');
require('moment-duration-format');

var flot = require('../Flot/jquery.flot');


var	PLOT_COLORS = {
	'VA': '#ff0000',
	'VB': '#00ff00',
	'VC': '#0000ff',
	'PIB': '#ffd42a',
	'GRID': '#cacaca',
	'FILL': 0.1
}

var AlarmDetailTable = React.createClass({

	propTypes: {
		alarm: React.PropTypes.object.isRequired,
		trigger: React.PropTypes.object.isRequired
	},

	getInitialState: function() {
		return {
			tab: 0,
			zone: 0
		}
	},


	render: function() {

		var alarm = this.props.alarm,
			trigger = this.props.trigger,
			dateFormat = 'ddd, MMM D h:mm:ss.SSS a',
			duration = alarm.end_ms ? moment.duration(alarm.end_ms - alarm.start_ms) : null,

			tabClass_0 = classNames({ active: this.state.tab == 0 }),
			tabClass_1 = classNames({ active: this.state.tab == 1 }),
			tabClass_2 = classNames({ active: this.state.tab == 2 });

		return (
			<table className='alarm-detail'>
				<tbody>
					<tr>
						<th className='alarm-group' colSpan='4'>{alarm.group}</th>
					</tr>
					<tr>
						<th>Trigger</th><td>{trigger.name + ', ' + trigger.sensors[alarm.sensor].name + ' (' + alarm.channel + ')'}</td>
						<th>Type</th><td>{alarm.type}</td>
					</tr>
					<tr>
						<th>Start</th><td>{moment(alarm.start_ms).format(dateFormat)}</td>
						<th>End</th><td>{alarm.end_ms ? moment(alarm.end_ms).format(dateFormat) : '--'}</td>
					</tr>
					<tr>
						<th>Duration</th><td>{duration ? duration.format('h:mm:ss.SSS') + ' (~' + duration.humanize() + ')' : '--'}</td>
						<td colSpan='2'></td>
					</tr>
					<tr>
						<td className='plots' colSpan='4'>
							<div className='loaderWrapper'><div className='loader'>Loading...</div></div>
							<ul className='plot-tabs'>
								<li className={tabClass_0}>
									<button id='tab_0' onClick={this._setPlotTab}>Source/Utility Voltage</button>
								</li>
								<li className={tabClass_1}>
									<button id='tab_1' onClick={this._setPlotTab}>Power Conditioner Voltage</button>
								</li>
								<li className={tabClass_2}>
									<button id='tab_2' onClick={this._setPlotTab}>Power Conditioner Current</button>
								</li>
							</ul>
							{	
								this._renderAlarmPlots()
							}
						</td>
					</tr>
				</tbody>
			</table>
		);
	},

	_renderAlarmPlots: function() {
		var _this = this;
				
		function dataSeries(alarmEndPlot) {
			var series = [],
				traces = [ [], [], [], [] ],

				a = _this.props.alarm,

				N = a.data.ch0.s0.length, // 2X data points if start/end both included in alarm data

				step = a.step_ms, // time between points

				start_time = (a.end_ms) // if there is an end_ms to the event
					? -(N/2 - 1) * a.step_ms // just use half the data points
					: -(N - 1) * a.step_ms, // else use all points

				index_end = (a.end_ms)
					? N/2
					: N;

			// assemble live and consolidated data traces
			for (var i = 0; i < index_end; i++) {

				var t = 1000 * (start_time + step * i),
					index = (a.end_ms && alarmEndPlot) ? i + N/2 : i;

				// put phase imbalance trace first, so it renders under the phase traces
				switch (_this.state.tab) {

					case 1: // Load Voltages & PI
						traces[0].push([ t, a.data['ch7']['s0'][index] ]); // phase imbalance
						traces[1].push([ t, a.data['ch4']['s0'][index] ]); // phase A
						traces[2].push([ t, a.data['ch5']['s0'][index] ]); // phase B
						traces[3].push([ t, a.data['ch6']['s0'][index] ]); // phase C
						break;

					case 2: // Load Currents (no PI)
						traces[0].push([ t, a.data['ch4']['s1'][index] ]); // phase A
						traces[1].push([ t, a.data['ch5']['s1'][index] ]); // phase B
						traces[2].push([ t, a.data['ch6']['s1'][index] ]); // phase C
						break;

					default: // Source Voltages & PI
						traces[0].push([ t, a.data['ch3']['s0'][index] ]); // phase imbalance
						traces[1].push([ t, a.data['ch0']['s0'][index] ]); // phase A
						traces[2].push([ t, a.data['ch1']['s0'][index] ]); // phase B
						traces[3].push([ t, a.data['ch2']['s0'][index] ]); // phase C
				}
			}

			// push data traces into flot data series
			if (_this.state.tab != 2) {
				series.push({ data: traces[0], yaxis: 2, color: PLOT_COLORS['PIB'], lines: { lineWidth: 1 }, shadowSize: 0 });
				series.push({ data: traces[1], yaxis: 1, color: PLOT_COLORS['VA'] });
				series.push({ data: traces[2], yaxis: 1, color: PLOT_COLORS['VB'] });
				series.push({ data: traces[3], yaxis: 1, color: PLOT_COLORS['VC'] });
			} else {
				series.push({ data: traces[0], yaxis: 1, color: PLOT_COLORS['VA'] });
				series.push({ data: traces[1], yaxis: 1, color: PLOT_COLORS['VB'] });
				series.push({ data: traces[2], yaxis: 1, color: PLOT_COLORS['VC'] });				
			}

			return series;
		}
		
		function plotOptions() {

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
			if (!_this.props.alarm || !_this.props.alarm.data || !el) return;

			// generate the plot here
			var plot = $.plot($(el), dataSeries(el.className.match(/end/i)), plotOptions());
		}

		function renderLegend(tab) {
			var traceA, traceB, traceC, traceD;

			switch (tab) {

				case 1: // Power Conditioner Voltages - WYE connected
					traceA = 'Va';
					traceB = 'Vb';
					traceC = 'Vc';
					traceD = 'Phs. Imb.';
					break;

				case 2: // Power Conditioner Currents (no Phase Imbalance)
					traceA = 'Ia';
					traceB = 'Ib';
					traceC = 'Ic';
					break;

				default: // Source/Utility Voltages - DELTA connected
					traceA = 'Vab';
					traceB = 'Vbc';
					traceC = 'Vca';
					traceD = 'Phs. Imb.';
			}


			return (
				<table className='legend'><tbody>
					<tr>
						<td className='ph-A'>{traceA}</td>
						<td className='ph-B'>{traceB}</td>
						<td className='ph-C'>{traceC}</td>
						{ traceD ? <td className='pib'>{traceD}</td> : null }
					</tr>
				</tbody></table>
			);
		}

		var plotWrapperClass_start = classNames('plot-wrapper start', { 'active': this.state.zone == 0, 'single-axis': this.state.tab == 2 }),
			plotWrapperClass_end = classNames('plot-wrapper end', { 'active': this.state.zone == 1, 'single-axis': this.state.tab == 2 }),
			carousel_start = classNames({ 'active': this.state.zone == 0 }),
			carousel_end = classNames({ 'active': this.state.zone == 1 });

		return (
			<div className='plot-tab-content'>

				{renderLegend(this.state.tab)}

				<div className={plotWrapperClass_start}>
					<div className='plot start' ref={updatePlot}></div>
				</div>

				<div className={plotWrapperClass_end}>
					<div className='plot end' ref={updatePlot}></div>
				</div>

				<div className='carousel-handle'>
					<button title='Show event start' id='zone_0' className={carousel_start} onClick={this._setPlotZone}/>
					<button title='Show event end' id='zone_1' className={carousel_end} onClick={this._setPlotZone} />
				</div>

				<div className='x-axis-label'>Time To Alarm (ms) 
					
					<span className={carousel_start}>
						<span className='strong'>Alarm Start: </span>
						<span> {moment(this.props.alarm.start_ms).format("h:mm:ss.SSS a")}</span>
					</span>

					<span className={carousel_end}>
						<span className='strong'>Alarm End: </span>
						<span>{moment(this.props.alarm.end_ms).format("h:mm:ss.SSS a")}</span>
					</span>
				</div>
				
				<div className='y-axis-label left'>
					{ this.state.tab !== 2 ? 'Phase Voltage (V)' : 'Phase Current (A)' }
				</div>
				
				{ this.state.tab !== 2 ? <div className='y-axis-label right'>Phase Imbalance (%)</div> : null }
			</div>
		)
	},

	_setPlotTab: function(e) {
		var new_tab = parseInt(e.target.id.split('_')[1]);
		this.setState({ tab: new_tab });
	},

	_setPlotZone: function(e) {
		var new_zone = parseInt(e.target.id.split('_')[1]);
		this.setState({ zone: new_zone });
	}

});

module.exports = AlarmDetailTable;
