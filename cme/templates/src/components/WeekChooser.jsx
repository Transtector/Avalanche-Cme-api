/**
 * WeekChooser.jsx
 * james.brunner@kaelus.com
 *
 * Show range of weeks (current week at top) and let user pick one for Alarms summary.
 */
'use strict';

var React = require('react');

var moment = require('moment');

var WeekChooser = React.createClass({
	
	getInitialState: function () {
		return {
			selectedWeek: 0
		}
	},

	componentWillReceiveProps: function(nextProps) {
		if (!nextProps.open) return

		this.setState({ selectedWeek: nextProps.week });
	},

	render: function() {

		if (!this.props.open) return null;


		// pre-process weeks into array of weekItems to be rendered

		function weekItem(y, w, i, wm) {
			var wi = {};
			wi.y = y;
			wi.w = w;
			wi.i = i;
			wi.wm = wm;
			return wi;
		}
		var year = 0;
		var weekItems = [];
		this.props.weeks.forEach(function(w, i) {
			var weekMoment = moment().add(w, 'weeks'),
				y = weekMoment.year();

			if (y != year) {
				year = y;
				weekItems.push(weekItem(y, w, i, weekMoment));
			}
			weekItems.push(weekItem(null, w, i, weekMoment));
		});

		return (
			<div className="panel" id='week-chooser'>
				<div className="popup">
					<div className="title">Weekly Event Logs</div>
					
					<ul className="weeks">
						{weekItems.map(function(wi, i) {
							if (wi.y)
								return this._renderWeekItemYear(wi);
							return this._renderWeekItem(wi);
						}, this)}
					</ul>

					<div className="buttons">
						<button className='btn' onClick={this._onCancel}>Cancel</button>
						<button className='btn' onClick={this._onOk}>Ok</button>
					</div>
				</div>
			</div>
		)
	},

	_renderWeekItemYear: function(wi) {
		return <li key={'year_' + wi.i} className='year'>{wi.y}</li>;
	},

	_renderWeekItem: function(wi) {
		var dateFormat = 'MMM Do',
			weekNumber = wi.wm.format('w'),
			startDate = wi.wm.startOf('week').format(dateFormat),
			endDate = wi.wm.endOf('week').format(dateFormat),
			item;

		if (wi.w == 0) {
			item = 'This week';
		} else if (wi.w == -1) {
			item = 'Last week';
		} else {
			item = startDate + ' - ' + endDate;
		}

		return (
			<li key={'week_' + wi.i}>
				<label forHmtl={'w_' + wi.i}>
					<input type='radio' id={'w_' + wi.i} name='week' value={wi.w}
						onChange={this._onSelectWeek}
						checked={this.state.selectedWeek == wi.w} />
					Week {weekNumber}:<span>{item}</span>
				</label>
			</li>
		)
	},

	_onSelectWeek: function(e) {

		this.setState({ selectedWeek: e.target.value });
	},

	_onCancel: function() {

		this.props.onChoice(null);
	},

	_onOk: function() {

		this.props.onChoice(this.state.selectedWeek);
	}
	
});

module.exports = WeekChooser;