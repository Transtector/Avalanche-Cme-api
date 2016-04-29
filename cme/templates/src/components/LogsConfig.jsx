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

var InputGroup = require('./InputGroup');
var TextInput = require('./TextInput');

var classNames = require('classnames');
var assign = require('object-assign'); // ES6 polyfill


var LogsConfig = React.createClass({

	getInitialState: function () {

		return { "logs": [
			{"access.log": 4048},
			{"access.log.1": 10098},
			{"access.log.2": 10177},
			{"access.log.3": 10231},
			{"access.log.4": 10202},
			{"access.log.5": 10192},
			{"cme.log": 3682},
			{"cme.log.1": 10188},
			{"cme.log.2": 10190},
			{"cme.log.3": 10170},
			{"server.log": 0},
			{"server.log.1": 10216},
			{"server.log.2": 9692},
			{"server.log.3": 8806},
			{"server.log.4": 10207},
			{"server.log.5": 10167}
		]};
	},

	render: function() {
		return (
			<InputGroup id="logs">
				<ul>
					{this.state.logs.map(function(logitem) {

						var name = Object.keys(logitem)[0];
						var size = logitem[name].toLocaleString() + " B";

						return (
							<li className='input-group-cluster' key={name}>
								<button className="btn icon-left">
									<span className="btn-icon icon-logbook"></span>
									<div>{name}</div>
									<div>{size}</div>
								</button>
								<button className="btn icon-download" />
								<button className="btn icon-trash" />								
							</li>
						);
					})}

				</ul>
			</InputGroup>
		);
	}
});

module.exports = LogsConfig;