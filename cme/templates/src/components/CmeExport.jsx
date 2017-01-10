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

var CmeExport = React.createClass({

	getInitialState: function () {
		return {
			ch_id: qs['c'], // e.g., 'ch0'
			history: qs['h'], // e.g., 'daily'
			ch: {} // empty until mounted - then filled w/ch object
		};
	},
	
	componentDidMount: function() {

		var _this = this;

		// Send a request to populate the data array for the identified channel.
		// We're not using the Action & Store to monitor channel data, however, as it
		// will continue to update on the parent page.  Here we'll just use the
		// CmeAPI call directly, and process the return.
		CmeAPI.channel(this.state.ch, null, this.state.history)
			.done(function(ch) {

				_this.setState({ ch: ch[this.state.ch_id] });

			})
			.fail(function(e) {
				alert("Something bad happened!");
			});
	},

	render: function() {
		var FORMAT = 'YYYY-MM-d h:mm:ss';

		// ch will not be loaded until query response.  Provide some sensible
		// placeholders for table until then.
		var channel = this.state.ch && (this.state.ch.name + ' - ' + this.state.ch.description) || this.state.ch_id,
			
			data = this.state.ch && this.state.ch.data,

			start = data && moment(data[0][0] * 1000.0).format(FORMAT),
			
			end = data && moment(data[0][1] * 1000.0).format(FORMAT),

			step = data && (data[0][2] + ' seconds'),

			duration = 'long time',

			points = data && (data[2][0].length);



		return (
			<div className="export">
				<table>
					<thead>
						<tr><th>Channel</th><td>{channel}</td></tr>
						<tr><th>Start</th><td>{start}</td></tr>
						<tr><th>End</th><td>{end}</td></tr>
						<tr><th>Step</th><td>{step}</td></tr>
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

module.exports = CmeExport;