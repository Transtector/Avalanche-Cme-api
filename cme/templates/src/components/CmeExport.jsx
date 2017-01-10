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

	var date = moment.format("MMM D"),
		time = moment.format(config.display12HourTime ? config.displayTimeFormat12Hour : config.displayTimeFormat24Hour);

	return date + ' ' + time;
}

function capitalize(str) {
	if (!str) return str;

	return str.slice(0, 1).toUpperCase() + str.slice(1);
}

function pluralize(num, unit) {
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
			
			data = this.state.ch && this.state.ch.data,

			start = data && utils.formatRelativeMoment(moment.utc(data[0][0] * 1000), this._config.displayRelativeTo, this._config.zone),
			
			end = data && utils.formatRelativeMoment(moment.utc(data[0][1] * 1000), this._config.displayRelativeTo, this._config.zone),

			step = data && data[0][2],

			step_pretty = formatPrettySeconds(step),

			duration = data && end.from(start, true),

			points = data && (data[2].length);

		return (
			<div className="export">
				<h2>{capitalize(this.state.id)} {capitalize(this.state.history)} History</h2> 
				<table>
					<thead>
						<tr><th>Channel</th><td><span>{ch_name}</span>&nbsp;<span>{ch_description}</span></td></tr>
						<tr><th>Start</th><td>{formatMoment(start, this._config)}</td></tr>
						<tr><th>End</th><td>{formatMoment(end, this._config)}</td></tr>
						<tr><th>Step</th><td><span>{step} seconds</span>&nbsp;<span>{step_pretty}</span></td></tr>
						<tr><th>Duration</th><td>{duration}</td></tr>
						<tr><th>Points</th><td>{points}</td></tr>
					</thead>
					<tbody>
						<tr><th>Body</th></tr>
					</tbody>
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