/**
 * ConfigPanel.jsx
 * james.brunner@kaelus.com
 *
 * CME configuration components sit in this panel.
 */
var React = require('react');

var Constants = require('../Constants');
var Actions = require('../Actions');
var Store = require('../Store');

var InputGroup = require('./InputGroup');
var TextInput = require('./TextInput');

var ClockConfig = require('./Clock');
var TempConfig= require('./Thermometer');

var NetConfig = require('./NetConfig');
var UserConfig = require('./UserConfig');
var LogsConfig = require('./LogsConfig');
var ResetPanel = require('./ResetPanel');

var Updates = require('./UpdatesPanel');

var utils = require('../CmeApiUtils');
var moment = require('moment');

var classNames = require('classnames');


var SettingsPanel = React.createClass({

	getInitialState: function () {
		return {
			config: Store.getState().config
		};
	},

	componentDidMount: function() {
		Store.addChangeListener(Constants.CONFIG, this._onConfigChange);
	},

	componentWillUnmount: function() {
		Store.removeChangeListener(Constants.CONFIG, this._onConfigChange);
	},

	render: function () {
		
		// nothing to configure if config is empty
		if (Object.keys(this.state.config).length <= 0)
			return null;

		console.log("ConfigPanel rendering...");

		var config = this.state.config;

		return (
			<div className="panel" id="settings">
				<div className="panel-header">
					<div className="title">Settings</div>
					<div className="subtitle">Device settings</div>
				</div>

				<div className="panel-content">
				
					<UserConfig />

					<InputGroup id="general">
						<TextInput id="general.name" name='name' defaultValue={config.general.name} onBlur={this._requestChange} />
						<TextInput id="general.description" name='description' defaultValue={config.general.description} onBlur={this._requestChange} />
						<TextInput id="general.location" name='device location' defaultValue={config.general.location} onBlur={this._requestChange} />
					</InputGroup>

					<InputGroup id="support">
						<TextInput id="support.contact" name='contact' defaultValue={config.support.contact} onBlur={this._requestChange} />
						<TextInput id="support.email" name='email' defaultValue={config.support.email} onBlur={this._requestChange} />
						<TextInput id="support.phone"  name='phone' defaultValue={config.support.phone} onBlur={this._requestChange} />
					</InputGroup>

					<NetConfig config={config.network} />
					
					<ClockConfig config={config.clock} flavor="config" pollPeriod={1000} />
					
					<TempConfig config={config.temperature} flavor="config" pollPeriod={10000} />

					{/*  Hidden for now - doesn't really do anything..
					<InputGroup id="snmp">
						<div className="input-group-cluster">
							<label htmlFor="mib">MIB</label>
							<a id="mib" href="#nogo">Download MIB</a>
						</div>
					</InputGroup>

					<InputGroup id="http">
						<TextInput id="cors" 
								   placeholder="CORS whitelist" 
								   value={config.http.corsWhitelist} />
					</InputGroup>
					*/}

					<LogsConfig pollPeriod={5000} />

					<Updates pollPeriod={5000} />

					<ResetPanel />

				</div>

			</div>
		);
	},

	_onConfigChange: function() {
		this.setState({ config: Store.getState().config });
	},

	_requestChange: function(e) {

		var id = e.target.id.split('.'), // id='general.name' -> [ 'general', 'name' ]
			group = id[0], // 'general'
			key = id[1], // 'name'
			val = e.target.value;

		// console.log(group + '.' + key + ': ' + this.props.config[group][key] + ' --> ' + val);

		if (this.state.config[group][key] == val) return; // skip if no change

		obj = {};
		obj[key] = val;
		Actions.config(obj); // config() just takes the key and will search config groups (for now)
	}
});

module.exports = SettingsPanel;
