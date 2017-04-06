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

var AlarmPlot = require('./AlarmPlot');

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

							<AlarmPlot alarm={alarm} tab={this.state.tab} zone={this.state.zone} onZoneChange={this._setPlotZone} />
							
						</td>
					</tr>
				</tbody>
			</table>
		);
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
