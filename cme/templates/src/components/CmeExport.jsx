/**
 * CmeExport.jsx
 * james.brunner@kaelus.com
 *
 * CME Export page component.  Acts as a simple data/viewer formatter to hold channel
 * data in a browser tab for the user to save, print, etc. 
 */
var React = require('react');
var CmeAPI = require('../CmeAPI');

var $ = require('jquery');

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

function renderSensorHeader(ch, h, title, field) {

	if (!ch || !ch.sensors || !ch.data)
		return <tr><th>{title}</th></tr>;

	return (
		<tr>
			<th>{title}</th>
			{
				// data[1] holds the sensors internal Id (s0_VAC_Vrms)
				// and we'll use it to pull the sensor object
				ch.data[1].map(function(s, i) {
					var id = s.split('_')[0];

					// now find the matching sensor object
					var s_obj = ch.sensors.find(function(s){
						return s.id == id;
					});

					var v = (field == 'type')
					? utils.SENSOR_TYPE[s_obj[field]]
					: s_obj[field];

					return <td colSpan={(h != 'live') ? 3 : 0} key={'s' + i + '_' + field}>{v}</td>;
				})
			}
		</tr>
	)
}

function renderSensorDataHeader(ch, h) {
	if (!ch || !ch.sensors)
		return <tr></tr>;

	return (
		<tr>
			<th>Time</th>
			{
				ch.sensors.map(function(s, i) { 
					var vals = (h != 'live') ? ['Min', 'Avg', 'Max'] : ['Value'];

					return vals.map(function(a, j) {
						return <th key={'s' + i + '_' + a}>{a}</th>;
					})

				})
			}
		</tr>
	)
}

function renderSensorDataBody(ch, h, config) {
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

			var cols = (h != 'live') ? [3, 2, 4] : [2];

			function renderSensorDataCell(c) {
				return <td>{ch.data[c][i][j] || '-'}</td>;
			}

			// render Min (data[3]), Avg (data[2]), and Max (data[4]) cells
			// unless 'live', then only Value (data[2]) is used.
			return cols.map(renderSensorDataCell);
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
			id: qs['c'].toLowerCase(), // channel id, e.g., 'ch0'
			history: qs['h'].toLowerCase(), // history block, e.g., 'daily'
			ch: {}, // empty until mounted - then filled w/ch object

			instructionsVisible: false
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

			spanMultiplier = (this.state.history != 'live') ? 3 : 1,

			colSpan = data ? (spanMultiplier * data[1].length) : 0;

		step = step ? step + ' seconds' : '';
		duration = duration ? duration + ' seconds' : '';

		return (
			<div className="export">
				<h2 className='title'>{capitalize(this.state.id)} {capitalize(this.state.history)} History</h2>
				<button className="btn" onClick={this._toggleInstructions}>?</button>

				<table>
					<thead>
						<tr><th>Channel</th><td colSpan={colSpan}><span>{ch_name}</span><span>{ch_description}</span></td></tr>
						<tr><th>Start</th><td colSpan={colSpan}>{formatMoment(start, this._config)}</td></tr>
						<tr><th>End</th><td colSpan={colSpan}>{formatMoment(end, this._config)}</td></tr>
						<tr><th>Step</th><td colSpan={colSpan}><span>{step}</span><span>{step_pretty}</span></td></tr>
						<tr><th>Duration</th><td colSpan={colSpan}><span>{duration}</span><span>{duration_pretty}</span></td></tr>
						<tr><th>Points</th><td colSpan={colSpan}>{points}</td></tr>
						{renderSensorHeader(this.state.ch, this.state.history, 'Sensor', 'name')}
						{renderSensorHeader(this.state.ch, this.state.history, 'Type', 'type')}
						{renderSensorHeader(this.state.ch, this.state.history, 'Units', 'unit')}
						{renderSensorDataHeader(this.state.ch, this.state.history)}
					</thead>
					{renderSensorDataBody(this.state.ch, this.state.history, this._config)}
				</table>

				<div className={(this.state.instructionsVisible ? '' : 'hidden') + ' instructions'}>
					<h3>Instructions</h3>
					<p>This page can be used to export CME channel data for use in a variety
						of applications, for example Microsoft Excel.</p>

					<h4>Copy/Paste Method</h4>
					<p>Close these instructions and select the desired data from the data
						table.  Copy the selected data to the clipboard then paste it
						into the target application.  Generally, pasting the unformatted or
						raw data works best for this.</p>

					<h4>Download CSV Method</h4>
					<p>Click '.csv' to covert this table to raw comma-separated values
						downloaded to the browser.</p>

					<div className="buttons">
						<button className="btn" onClick={this._clearFormatting}>.csv</button>
						<button className="btn" onClick={this._toggleInstructions}>Close</button>
					</div>
				</div>

				<div className={'loaderWrapper' + (this.state.ch ? ' hidden' : '')}>
					<div className='loader'>Loading...</div>
				</div>
			</div>
		);
	},

	_clearFormatting: function() {

		var bodytext = [];

		bodytext.push($('h2.title').text());

		$('.export table tr').each(function(i) {

			var cell = [];
			$(this).children().each(function(j) {
				cell.push($(this).text())
			});
			bodytext.push(cell.join()); // this part does the CSV
		});

		// Replaces the current document body with raw (pre) formatted CSV
		document.open();
		document.write('<pre style="word-wrap: break-word; white-space: pre-wrap;">' + bodytext.join('\n') + '</pre>');
		document.close();

		// Downloads the CSV
		location.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(bodytext.join('\n'));
	},

	_toggleInstructions: function() {

		this.setState({ instructionsVisible: !this.state.instructionsVisible });
	}
});

module.exports = CmeExport;