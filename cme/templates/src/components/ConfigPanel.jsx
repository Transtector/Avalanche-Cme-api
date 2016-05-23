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
var LogsConfig = require('./LogsConfig');

var Updates = require('./UpdatesPanel');

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
						<TextInput id="general.name" name='name' defaultValue={config.general.name} onBlur={this._requestChange} />
						<TextInput id="general.description" name='description' defaultValue={config.general.description} onBlur={this._requestChange} />
						<TextInput id="general.location" name='location' defaultValue={config.general.location} onBlur={this._requestChange} />
					</InputGroup>

					<InputGroup id="support">
						<TextInput id="support.contact" name='contact' defaultVvalue={config.support.contact} onBlur={this._requestChange} />
						<TextInput id="support.email" name='email' defaultVvalue={config.support.email} onBlur={this._requestChange} />
						<TextInput id="support.phone"  name='phone' defaultVvalue={config.support.phone} onBlur={this._requestChange} />
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

					<LogsConfig />

					<Updates />

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

		var id = e.target.id.split('.'), // id='general.name' -> [ 'general', 'name' ]
			group = id[0], // 'general'
			key = id[1], // 'name'
			val = e.target.value;

		// console.log(group + '.' + key + ': ' + this.props.config[group][key] + ' --> ' + val);

		if (this.props.config[group][key] == val) return; // skip if no change

		obj = {};
		obj[key] = val;
		Actions.config(obj); // config() just takes the key and will search config groups (for now)
	},

	_factoryReset: function() {
		if (confirm("CME configuration will be reset to factory defaults.\n\nOk to continue?\n\n"))
			Actions.reset();
	}
});

module.exports = ConfigPanel;
