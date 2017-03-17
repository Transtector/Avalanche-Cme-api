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
var Store = require('../Store');

var InputGroup = require('./InputGroup');

var classNames = require('classnames');
var moment = require('moment');

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

	_pollTimeout: null,
	_pollStartTime: 0,

	propTypes: {
		pollPeriod: React.PropTypes.number // how fast to poll in milliseconds
	},

	getDefaultProps: function() {
		return {
			pollPeriod: 10000
		}
	},

	getInitialState: function () {

		return { logs: formatLogsList(Store.getState().logs) };
	},

	componentDidMount: function() {
		Store.addChangeListener(Constants.LOGS, this._onLogsChange);
		Actions.logs(); // fill list first time through
	},

	componentWillUnmount: function() {
		this._stopPoll();
		Store.removeChangeListener(Constants.LOGS, this._onLogsChange);
	},	

	render: function() {

		return (
			<InputGroup title="System Logs" onExpand={this._startPoll} onCollapse={this._stopPoll}>
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
		var _this = this;

		this.setState({	logs: formatLogsList(Store.getState().logs) }, function (){
			if (_this._pollStartTime) {

				var age = moment().valueOf() - _this._pollStartTime,
					period = (age >= _this.props.pollPeriod)
								? 0
								: _this.props.pollPeriod - (age % _this.props.pollPeriod)

				clearTimeout(_this._pollTimeout);
				_this._pollTimeout = null;
				_this._pollTimeout = setTimeout(_this._startPoll, period);
			}

		});
	},

	_startPoll: function () {
		this._pollStartTime = moment().valueOf();
		Actions.logs();
	},

	_stopPoll: function () {
		this._pollStartTime = 0;
		clearTimeout(this._pollTimeout);
		this._pollTimeout = null;
	}
});

module.exports = LogsConfig;