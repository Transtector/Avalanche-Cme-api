/**
 * LogsConfig.jsx
 * james.brunner@kaelus.com
 *
 * Component to group CME log files access
 */
 'use strict';

var React = require('react');

var Constants = require('../Constants');
var Actions = require('../Actions');
var PollingStore = require('../PollingStore');

var InputGroup = require('./InputGroup');

var classNames = require('classnames');
var assign = require('object-assign'); // ES6 polyfill

function formatLogsList(logslist) {
	// create a log item with log's name, size and a 'delete' flag
	// that will be used when a log has been deleted but the list
	// is not yet refreshed.
	var logs = logslist.map(function (log) {
		var item = {};
		item.name = Object.keys(log)[0];
		item.bytes = parseInt(log[item.name]);
		item.size = log[item.name].toLocaleString() + " B";
		item.deleted = false;
		return item;
	});
	return logs;
}

var LogsConfig = React.createClass({

	_logsPollTimeout: null,
	_logsPollStartTime: 0,
	_logsPollPeriod: 5000,

	getInitialState: function () {

		return { logs: formatLogsList(PollingStore.getState().logs) };
	},

	componentDidMount: function() {
		PollingStore.addChangeListener(Constants.ChangeTypes.LOGS, this._onLogsChange);
		this._startLogsPoll(); // poll initially to fill list first time through
	},

	componentWillUnmount: function() {
		this._stopLogsPoll();
		PollingStore.removeChangeListener(Constants.ChangeTypes.LOGS, this._onLogsChange);
	},	

	render: function() {
		// Upon render, if we're polling, we'll start a new Logs request after the
		// appropriate period has elapsed.  We clear any pending request so as to
		// keep only one at a time active.
		if (this._logsPollStartTime) {

			var age = moment().valueOf() - this._logsPollStartTime,
				period = (age >= this._logsPollPeriod)
							? 0
							: this._logsPollPeriod - (age % this._logsPollPeriod)

			clearTimeout(this._logsPollTimeout);
			this._logsPollTimeout = null;
			this._logsPollTimeout = setTimeout(this._pollLogs, period);
		}

		return (
			<InputGroup id="logs" onExpand={this._startLogsPoll} onCollapse={this._stopLogsPoll}>
				<ul>
					{this.state.logs.map(function(log) {
						return (
							<li className='input-group-cluster' key={log.name}>
								<button className="btn icon-left"
									onClick={this._viewLog.bind(this, log.name)}
									disabled={log.bytes <= 0 || log.deleted}>
									<span className="btn-icon icon-logbook"></span>
									<div>{log.name}</div>
									<div>{log.size}</div>
								</button>
								<button className="btn icon-download" 
									onClick={this._downloadLog.bind(this, log.name)}
									disabled={log.bytes <= 0 || log.deleted} />
								<button className="btn icon-trash" 
									onClick={this._clearLog.bind(this, log.name)}
									disabled={log.bytes <= 0 || log.deleted} />
							</li>
						);
					}, this)}

				</ul>
			</InputGroup>
		);
	},

	_viewLog: function(name) {
		Actions.logs(name); // call logs w/actual log file name to view (in a new tab)
	},

	_downloadLog: function(name) {
		Actions.logs(name, true); // just download the log file
	},

	_clearLog: function(name) {

		if (confirm("The log file will be deleted, and its current content will be displayed in another tab.\n\nOk to continue?\n\n")) {

			// mark the deleted log entry
			var logs = this.state.logs.map(function(log) {
				log.deleted = log.name == name;
				return log;
			});

			this.setState({ logs: logs });
			Actions.logs(name, false, true); // clear the identified log file
		}
	},

	_onLogsChange: function () {

		this.setState({	logs: formatLogsList(PollingStore.getState().logs) });
	},

	_pollLogs: function () {
		this._logsPollStartTime = moment().valueOf();
		Actions.logs();
	},

	_startLogsPoll: function () {
		if (!this._logsPollStartTime) {
			this._pollLogs();
		}
	},

	_stopLogsPoll: function () {
		this._logsPollStartTime = 0;
		clearTimeout(this._logsPollTimeout);
		this._logsPollTimeout = null;
	}
});

module.exports = LogsConfig;