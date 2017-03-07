/**
 * Dashboard.jsx
 * james.brunner@kaelus.com
 *
 * Default UI panel for the CmeApp - shows all configured channels in "ChannelPanels".
 */
 'use strict';

var React = require('react');

var Constants = require('../Constants');
var Actions = require('../Actions');
var Store = require('../Store');

var moment = require('moment');
var classNames = require('classnames');
var utils = require('../CmeApiUtils');

var ChannelPanel = require('./ChannelPanel');

// application-level key press handler
var key = require('../keymaster/keymaster.js');

var Dashboard = React.createClass({

	getInitialState: function() {
		return {
			channels: Store.getState().channels,
			config: Store.getState().config,
			alarms: false
		}
	},

	componentDidMount: function() {
		Store.addChangeListener(Constants.CHANNELS, this._onChannelsChange);
		Store.addChangeListener(Constants.CONFIG, this._onConfigChange);

		key('ctrl+5, ⌘+5', this._viewAlarms);

		// request hw channels update to get all available channels
		Actions.channels();
	},

	componentWillUnmount: function() {
		key.unbind('ctrl+5, ⌘+5');

		Store.removeChangeListener(Constants.CHANNELS, this._onChannelsChange);
		Store.removeChangeListener(Constants.CONFIG, this._onConfigChange);
	},

	render: function() {
		return (
			<div className="panel" id="home">
				<div className="panel-header">
					<div className="title">
						Dashboard
					</div>

					<div className="subtitle">
						Channel sensor measurements
					</div>

				</div>

				<div className="panel-content">
					{	
						this.state.channels.map(function(ch) {
							return <ChannelPanel key={ch} id={ch} />;
						})
					}
				</div>

				{this._renderNotification()}

			</div>
		);
	},

	_renderNotification: function() {
		var cls = classNames('notification', { 'alarms': this.state.alarms });

		return (
			<div className={cls}>
				<div className='title'>There are new alarms</div>
				<div className='message'>New alarms have been recorded since last acknowledged.</div>
				<div className='buttons'>
					<button className='btn' title='View alarms' onClick={this._viewAlarms}>View</button>
					<button className='btn' title='Acknowledge new alarms' onClick={this._ackAlarms}>Ok</button>
				</div>
			</div>
		);
	},

	_viewAlarms: function(e) {
		this.setState({ alarms: true });
		return false;
	},

	_ackAlarms: function(e) {
		
		this.setState({ alarms: false });
	},

	_onChannelsChange: function() {

		this.setState({	channels: Store.getState().channels	});
	},

	_onConfigChange: function() {

		this.setState({ config: Store.getState().config });
	}
});

module.exports = Dashboard;