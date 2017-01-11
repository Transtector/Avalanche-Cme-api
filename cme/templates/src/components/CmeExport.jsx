/**
 * CmeExport.jsx
 * james.brunner@kaelus.com
 *
 * CME Export page component.  Acts as a simple data/viewer formatter to hold channel
 * data in a browser tab for the user to save, print, etc. 
 */
var React = require('react');
var CmeAPI = require('../CmeAPI');

// loads the page's query string into an object, qs
var qs = (function(a) {
    if (a == "") return {};
    var b = {};
    for (var i = 0; i < a.length; ++i)
    {
        var p=a[i].split('=', 2);
        if (p.length == 1)
            b[p[0]] = "";
        else
            b[p[0]] = decodeURIComponent(p[1].replace(/\+/g, " "));
    }
    return b;
})(window.location.search.substr(1).split('&'));

var moment = require('moment');
var utils = require('../CmeApiUtils');


function error(e) {

	alert("Something bad happened: ", e);
}

function formatMoment(moment, config) {

	if (!moment) return '';

	var date = moment.format("MMM D Y"),
		time = moment.format(config.display12HourTime ? config.displayTimeFormat12Hour : config.displayTimeFormat24Hour);

	return date + ' ' + time;
}

function capitalize(str) {
	if (!str) return str;

	return str.slice(0, 1).toUpperCase() + str.slice(1);
}

function pluralize(num, word) {
	if (!num) return '';

	return num > 1 
		? num + ' ' + word + 's' 
		: num + ' ' + word;
}

function formatPrettySeconds(seconds) {
	if (!seconds) return '';

	var d = Math.floor(seconds / 86400);
	seconds -= d * 86400;

	var h = Math.floor(seconds / 3600) % 24;
	seconds -= h * 3600;

	var m = Math.floor(seconds / 60) % 60;
	seconds = m * 60;

	var days = pluralize(d, 'day');
	var hours = pluralize(h, 'hour');
	var minutes = pluralize(m, 'minute');

	return [days, hours, minutes].join(' ');
}

function renderSensorHeader(ch, title, item) {

	if (!ch || !ch.sensors)
		return (
			<tr><th>{title}</th></tr>
		);

	return (
		<tr>
			<th>{title}</th>
			{
				ch.sensors.map(function(s, i) {
					var r = (item == 'type')
					? utils.SENSOR_TYPE[s[item]]
					: s[item];

					return <td colSpan='3' key={'s' + i + '_' + item}>{r}</td>;
				})
			}
		</tr>
	)
}

function renderSensorDataHeader(ch) {
	if (!ch || !ch.sensors)
		return <tr></tr>;

	return (
		<tr>
			<th>Time</th>
			{
				ch.sensors.map(function(s, i) { 
					return ['Min', 'Avg', 'Max'].map(function(a, j) {
						return <th key={'s' + i + '_' + a}>{a}</th>;
					})

				})
			}
		</tr>
	)
}


function renderSensorDataBody(ch, config) {
	if (!ch || !ch.sensors || !ch.data) return null;

	var start = ch.data[0][0],
		step = ch.data[0][2];

	// Each data point creates a new row in the
	// table starting with the calculated time point
	// and followed by each sensors' min, avg, and
	// max data values.
	function renderSensorDataRow(p, i) {

		var time = start + i * step,
			time_moment = utils.formatRelativeMoment(moment.utc(time * 1000), config.displayRelativeTo, config.zone),
			time_formatted = formatMoment(time_moment, config);

		function renderSensorDataCells(s, j) {

			function renderSensorDataCell(c) {
				return <td>{ch.data[c][i][j] || '-'}</td>;
			}

			// render Min (data[3]), Avg (data[2]), and Max (data[4]) cells
			return [3, 2, 4].map(renderSensorDataCell);
		}

		return <tr key={'row' + i}><td>{time_formatted}</td>{p.map(renderSensorDataCells)}</tr>;
	}

	// map each point in the Avg data array (data[2])...
	return <tbody>{ch.data[2].map(renderSensorDataRow)}</tbody>;
}

var CmeExport = React.createClass({

	_config: {}, // holds the clock configuration - populated at componentDidMount

	getInitialState: function () {
		return {
			id: qs['c'], // channel id, e.g., 'ch0'
			history: qs['h'], // history block, e.g., 'daily'
			ch: {} // empty until mounted - then filled w/ch object
		};
	},
	
	componentDidMount: function() {

		var _this = this;

		// Pull and store the date/time configuration first
		// then the desired channel.
		CmeAPI.config()
			.done(function(config) {
				_this._config = config['config']['clock'];

			// Send a request to populate the data array for the identified channel.
			// We're not using the Action & Store to monitor channel data, however, as it
			// will continue to update on the parent page.  Here we'll just use the
			// CmeAPI call directly, and process the return.
			CmeAPI.channel(_this.state.id, null, _this.state.history)
				.done(function(response) {

					_this.setState({ ch: response[_this.state.id] });
				})
				.fail(error);
			})
			.fail(error);
	},

	render: function() {

		// ch will not be loaded until query response.  Provide some sensible
		// placeholders for table until then.
		var ch_name = this.state.ch && (this.state.ch.name || this.state.id),

			ch_description = this.state.ch && this.state.ch.description,

			// data[0] = [ t_start, t_end, t_step ]
			// data[1] = [ DS0, DS1, ..., DSN ]; DSx = "sx_stype_sunit" (e.g., "s0_VAC_Vrms")
			// data[2] = [ [ s0_value, s1_value, ..., sN_value ], [ s0_value, s1_value, ..., sN_value ], ... , [ s0_value, s1_value, sN_value ] ]
			// note: data[2] is AVG 
			// data[3] is MIN 
			// data[4] is MAX
			
			data = this.state.ch && this.state.ch.data,

			start = data && utils.formatRelativeMoment(moment.utc(data[0][0] * 1000), this._config.displayRelativeTo, this._config.zone),
			
			end = data && utils.formatRelativeMoment(moment.utc(data[0][1] * 1000), this._config.displayRelativeTo, this._config.zone),

			step = data && data[0][2] || '',

			step_pretty = formatPrettySeconds(step),

			duration = data && (data[0][1] - data[0][0]) || '',

			duration_pretty = data && end.from(start, true),

			points = data && (data[2].length),

			colSpan = data ? (3 * data[1].length) : 0;

		step = step ? step + ' seconds' : '';
		duration = duration ? duration + ' seconds' : '';

		return (
			<div className="export">
				<h2>{capitalize(this.state.id)} {capitalize(this.state.history)} History</h2> 
				<table>
					<thead>
						<tr><th>Channel</th><td colSpan={colSpan}><span>{ch_name}</span><span>{ch_description}</span></td></tr>
						<tr><th>Start</th><td colSpan={colSpan}>{formatMoment(start, this._config)}</td></tr>
						<tr><th>End</th><td colSpan={colSpan}>{formatMoment(end, this._config)}</td></tr>
						<tr><th>Step</th><td colSpan={colSpan}><span>{step}</span><span>{step_pretty}</span></td></tr>
						<tr><th>Duration</th><td colSpan={colSpan}><span>{duration}</span><span>{duration_pretty}</span></td></tr>
						<tr><th>Points</th><td colSpan={colSpan}>{points}</td></tr>
						{renderSensorHeader(this.state.ch, 'Sensor', 'name')}
						{renderSensorHeader(this.state.ch, 'Type', 'type')}
						{renderSensorHeader(this.state.ch, 'Units', 'unit')}
						{renderSensorDataHeader(this.state.ch)}
					</thead>
					{renderSensorDataBody(this.state.ch, this._config)}
				</table>
				<div className={this.state.ch ? 'hidden' : 'loaderWrapper'}>
					<div className='loader'>Loading...</div>
				</div>
			</div>
		);
	}
});

window.moment = moment;
module.exports = CmeExport;