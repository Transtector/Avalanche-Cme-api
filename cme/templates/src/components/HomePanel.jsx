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
var Store = require('../Store');

var moment = require('moment');
var classNames = require('classnames');
var utils = require('../CmeApiUtils');

var ChannelPanel = require('./ChannelPanel');
var Clock = require('./Clock');
var Thermometer = require('./Thermometer');

var HomePanel = React.createClass({

	getInitialState: function() {
		return {
			channels: Store.getState().channels,
			config: Store.getState().config,
			pollClock: 1000,
			pollTemp: 10000
		}
	},

	componentDidMount: function() {
		Store.addChangeListener(Constants.CHANNELS, this._onChannelsChange);
		Store.addChangeListener(Constants.CONFIG, this._onConfigChange);

		// request hw channels update to get all available channels
		Actions.channels();
	},

	componentWillUnmount: function() {
		Store.removeChangeListener(Constants.CHANNELS, this._onChannelsChange);
		Store.removeChangeListener(Constants.CONFIG, this._onConfigChange);
	},

	render: function() {
		return (
			<div className="panel" id="home" onKeyDown={this._onKeyDown}>
				<div className="panel-header">
					<div className="title">
						Status
					</div>

					<div className="subtitle">
						CME device channels status
					</div>

					<div className='widgets'>
						<Clock config={this.state.config.clock} flavor='widget' pollPeriod={this.state.pollClock} />

						<Thermometer config={this.state.config.temperature} flavor='widget' pollPeriod={this.state.pollTemp} />
					</div>
				</div>

				<div className="panel-content">
					{	
						this.state.channels.map(function(ch) {
							return <ChannelPanel key={ch} id={ch} />;
						})
					}
				</div>
			</div>
		);
	},

	_onKeyDown: function(e) {
		console.log("Clock and Thermometer polling toggled...");

		var DASH_KEY_CODE = 189;
		
		if (e.shiftKey && e.keyCode === DASH_KEY_CODE) {
			this.setState({ 
				pollClock: this.state.pollClock < 0 ? 1000 : -1,
				pollTemp: this.state.pollTemp < 0 ? 10000 : -1 
			});
		}
	},

	_onChannelsChange: function() {

		this.setState({	channels: Store.getState().channels	});
	},

	_onConfigChange: function() {

		this.setState({ config: Store.getState().config });
	}
});

module.exports = HomePanel;