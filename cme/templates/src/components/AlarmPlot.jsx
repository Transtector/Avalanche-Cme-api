/**
 * AlarmPlot.jsx
 * james.brunner@kaelus.com
 *
 * Flot plot component wrapper for alarm detail waveform plots.
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

var AlarmPlot = React.createClass({

	getInitialState: function() {

		return {
			plots: {}, // holds refs to plots for updates

			plotOptions: {
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
	},

	render: function() {

		var plotWrapperClass_start = classNames('plot-wrapper start', { 'active': this.props.zone == 0, 'single-axis': this.props.tab == 2 }),
			plotWrapperClass_end = classNames('plot-wrapper end', { 'active': this.props.zone == 1, 'single-axis': this.props.tab == 2 }),
			carousel_start = classNames({ 'active': this.props.zone == 0 }),
			carousel_end = classNames({ 'active': this.props.zone == 1 });

		return (
			<div className='plot-tab-content'>

				{
					this._renderLegend(this.props.tab)
				}

				<div className={plotWrapperClass_start}>
					<div className='plot start' id='plotZone_0' ref={this._createPlot}></div>
				</div>

				<div className={plotWrapperClass_end}>
					<div className='plot end' id='plotZone_1' ref={this._createPlot}></div>
				</div>

				<div className='carousel-handle'>
					<button title='Show event start' id='zone_0' className={carousel_start} onClick={this.props.onZoneChange}/>
					<button title='Show event end' id='zone_1' className={carousel_end} onClick={this.props.onZoneChange} />
				</div>

				{ 
					$.isEmptyObject(this.state.plots) && <div className='loaderWrapper'><div className='loader'>Loading...</div></div>
				}

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
					{ 
						this.props.tab !== 2 
							? 'Phase Voltage (V)' 
							: 'Phase Current (A)' 
					}
				</div>
				
				{ 
					this.props.tab !== 2 
						? <div className='y-axis-label right'>Phase Imbalance (%)</div> 
						: null 
				}
			</div>
		);
	},

	componentDidUpdate: function(prevProps, prevState) {

		this._updatePlot(this.props.zone);
	},

	_renderLegend: function(tab) {
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
	},

	_dataSeries: function(zone) {
		var series = [],
			traces = [ [], [], [], [] ],

			a = this.props.alarm,

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
				index = (a.end_ms && zone) ? i + N/2 : i;

			// put phase imbalance trace first, so it renders under the phase traces
			switch (this.props.tab) {

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
		if (this.props.tab != 2) {
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
	},

	_updatePlot: function(zone) {

		if (!this.state.plots[zone]) return;

		this.state.plots[zone].setData(this._dataSeries(zone));
		this.state.plots[zone].setupGrid();
		this.state.plots[zone].draw();
	},

	_createPlot: function(el) {

		if (!this.props.alarm || !this.props.alarm.data || !el) return;

		var plotZone = parseInt(el.id.split('_')[1]),

			plot = $.plot($(el), this._dataSeries(plotZone), this.state.plotOptions);

		this.setState(function(prevState) {
			var plots = Object.assign({}, prevState.plots);
			plots[plotZone] = plot;
			return { plots: plots }
		});
	}
});

module.exports = AlarmPlot;
