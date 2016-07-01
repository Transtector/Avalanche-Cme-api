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
			config: Store.getState().config
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
			<div className="panel" id="home">
				<div className="panel-header">
					<div className="title">
						Status
					</div>

					<div className="subtitle">
						CME device channels status
					</div>

					<div className='widgets'>
						<Clock config={this.state.config.clock} flavor='widget' pollPeriod={1000} />

						<Thermometer config={this.state.config.temperature} flavor='widget' pollPeriod={10000} />
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

	_onChannelsChange: function() {

		this.setState({	channels: Store.getState().channels	});
	},

	_onConfigChange: function() {

		this.setState({ config: Store.getState().config });
	}
});

module.exports = HomePanel;