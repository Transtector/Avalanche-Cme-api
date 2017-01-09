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
			ch: qs['c'],
			history: qs['h'],
			ch_name: '',
			data: []
		};
	},
	
	componentDidMount: function() {
		// Send a request to populate the data array for the identified channel.
		// We're not using the Action & Store to monitor channel data, however, as it
		// will continue to update on the parent page.  Here we'll just use the
		// CmeAPI call directly, and process the return.
		CmeAPI.channel(this.state.ch, null, this.state.history)
			.done(function(ch) {
				this.setState({ data: [ 1 ] });
			})
			.fail(function(e) {
				alert("Something bad happened!");
			});
	},

	render: function() {

		return (
			<div className="export">
				<table>
					<thead>
						<tr><th>Channel</th><td>{this.state.ch_name || this.state.ch}</td></tr>
						<tr><th>Start</th><td>{moment().format()}</td></tr>
						<tr><th>End</th><td>{moment().format()}</td></tr>
						<tr><th>Step</th><td>300 seconds</td></tr>
						<tr><th>Points</th><td>300</td></tr>
						<tr><th>Duration</th><td>1 day</td></tr>

						<tr><th>Data</th></tr>
					</thead>
					<tbody>
						<tr><th>Body</th></tr>
					</tbody>
				</table>
				<div className={this.state.data.length > 0 ? 'hidden' : 'loader'}>Loading...</div>
			</div>
		);
	}
});

module.exports = CmeExport;