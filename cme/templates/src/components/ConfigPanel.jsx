/**
 * ConfigPanel.jsx
 * james.brunner@kaelus.com
 *
 * CME configuration components sit in this panel.
 */
var React = require('react');

var Constants = require('../Constants');
var Actions = require('../Actions');

var InputGroup = require('./InputGroup');
var TextInput = require('./TextInput');

var ClockConfig = require('./Clock');
var TempConfig= require('./Thermometer');

var NetConfig = require('./NetConfig');
var UserConfig = require('./UserConfig');

var utils = require('../CmeApiUtils');
var moment = require('moment');

var classNames = require('classnames');
var assign = require('object-assign'); // ES6 polyfill


var ConfigPanel = React.createClass({

	render: function () {
		var config = this.props.config;

		return (
			<div className="panel" id="config">
				<div className="panel-header">
					<div className="title">Configuration</div>
					<div className="subtitle">CME device settings</div>
				</div>

				<div className="panel-content">
				
					<UserConfig />

					<InputGroup id="general">
						<TextInput id="name" value={config.general.name} onChange={this._requestChange} />
						<TextInput id="description" value={config.general.description} onChange={this._requestChange} />
						<TextInput id="location" value={config.general.location} onChange={this._requestChange} />
					</InputGroup>

					<InputGroup id="support">
						<TextInput id="contact" value={config.support.contact} onChange={this._requestChange} />
						<TextInput id="email" value={config.support.email} onChange={this._requestChange} />
						<TextInput id="phone"  value={config.support.phone} onChange={this._requestChange} />
					</InputGroup>

					<NetConfig config={config.network} />
					
					<ClockConfig
						flavor="config"
						config={config.clock} />

					<TempConfig
						flavor="config"
						config={config.temperature} />

					<InputGroup id="snmp">
						<div className="input-group-cluster">
							<label htmlFor="mib">MIB</label>
							<a id="mib" href="#nogo">Download MIB</a>
						</div>
					</InputGroup>

					{/*  Hidden for now - doesn't really do anything..
					<InputGroup id="http">
						<TextInput id="cors" 
								   placeholder="CORS whitelist" 
								   value={config.http.corsWhitelist} />
					</InputGroup>
					*/}

					<div className="input-group">
						<button id="factory-reset"
								className='btn' 
								onClick={this._factoryReset}>
							Factory Reset
						</button>
					</div>

				</div>

			</div>
		);
	},

	_requestChange: function(e) {
		var obj = {};
		obj[e.target.name] = e.target.value;
		Actions.config(obj);
	},

	_factoryReset: function() {
		if (confirm("CME configuration will be reset to factory defaults.\n\nOk to continue?\n\n"))
			Actions.factoryReset();
	}
});

module.exports = ConfigPanel;
