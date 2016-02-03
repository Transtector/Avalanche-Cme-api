/**
 * HomePanel.jsx
 * james.brunner@kaelus.com
 *
 * CME status indicators site in the Home panel.
 */
 'use strict';

var React = require('react');

var Constants = require('../Constants');
var Actions = require('../Actions');
var PollingStore = require('../PollingStore');

var moment = require('moment');
var classNames = require('classnames');
var utils = require('../CmeApiUtils');

var ChannelPanel = require('./ChannelPanel');
var ClockWidget = require('./Clock');
var ThermometerWidget = require('./Thermometer');

var HomePanel = React.createClass({
	getInitialState: function() {
		return {
			channels: PollingStore.getState().channels
		}
	},

	componentDidMount: function() {
		// request hw channels update to get all available channels
		PollingStore.addChangeListener(Constants.ChangeTypes.CHANNELS, this._onChannelsChange);
		Actions.channels();
	},

	componentWillUnmount: function() {

		PollingStore.removeChangeListener(Constants.ChangeTypes.CHANNELS, this._onChannelsChange);
	},

	render: function() {

		return (
			<div className="panel" id="home">
				<div className="panel-header">
					<div className="title">
						Status
					</div>
					<div className="subtitle">
						CME device channels status
					</div>
					<div className='widgets'>

						<ClockWidget config={this.props.clockConfig} />

						<ThermometerWidget config={this.props.temperatureConfig} />
					</div>
				</div>

				<div className="panel-content">
					{	
						this.state.channels.map(function(ch) {
							return <ChannelPanel key={ch.id} id={ch.id} />;
						})
					}
				</div>
			</div>
		);
	},

	_onChannelsChange: function() {
		this.setState({
			channels: PollingStore.getState().channels
		});
	},
});

module.exports = HomePanel;