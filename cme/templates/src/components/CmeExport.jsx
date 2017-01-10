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

function formatMoment(seconds, config) {

	var datetime = utils.formatRelativeMoment(
		moment.utc(seconds * 1000.0),
		config.displayRelativeTo,
		config.zone),

	date = datetime.format("MMM D"),
	time = datetime.format(config.display12HourTime ? config.displayTimeFormat12Hour : config.displayTimeFormat24Hour);

	return date + ' ' + time;
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
		CmeAPI.config('clock')
			.done(function(clock_config) {
				_this._config = clock_config['clock'];

			// Send a request to populate the data array for the identified channel.
			// We're not using the Action & Store to monitor channel data, however, as it
			// will continue to update on the parent page.  Here we'll just use the
			// CmeAPI call directly, and process the return.
			CmeAPI.channel(this.state.id, null, this.state.history)
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

			start = data && formatMoment(data[0][0], this._config),
			
			end = data && formatMoment(data[0][1], this._config),

			step = data && (data[0][2] + ' seconds'),

			duration = 'long time',

			points = data && (data[2].length);



		return (
			<div className="export">
				<table>
					<thead>
						<tr><th>Channel</th><td><span>{ch_name}</span>&nbsp;<span>{ch_description}</span></td></tr>
						<tr><th>Start</th><td>{start}</td></tr>
						<tr><th>End</th><td>{end}</td></tr>
						<tr><th>Step</th><td>{step}</td></tr>
						<tr><th>Duration</th><td><span>{duration}</span>&nbsp;<span>({this.state.history})</span></td></tr>
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