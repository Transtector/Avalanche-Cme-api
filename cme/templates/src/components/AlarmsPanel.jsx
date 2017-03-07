/**
 * AlarmsPanel.jsx
 * james.brunner@kaelus.com
 *
 * CME alarms summary and presentation panel.
 */
 'use strict';

var React = require('react');

var Constants = require('../Constants');
var Actions = require('../Actions');
var Store = require('../Store');

var moment = require('moment');
var classNames = require('classnames');
var utils = require('../CmeApiUtils');

// application-level key press handler
var key = require('../keymaster/keymaster.js');

var AlarmsPanel = React.createClass({

	getInitialState: function() {
		return {
			config: Store.getState().config,
			alarms: false
		}
	},

	componentDidMount: function() {
		Store.addChangeListener(Constants.CONFIG, this._onConfigChange);
	},

	componentWillUnmount: function() {
		Store.removeChangeListener(Constants.CONFIG, this._onConfigChange);
	},

	render: function() {
		return (
			<div className="panel" id="home">
				<div className="panel-header">
					<div className="title">
						Alarms
					</div>

					<div className="subtitle">
						Summary or Detail
					</div>

				</div>

				<div className="panel-content">
					Hi! I'm the alarms panel!
				</div>

			</div>
		);
	},

	_onConfigChange: function() {

		this.setState({ config: Store.getState().config });
	}
});

module.exports = AlarmsPanel;