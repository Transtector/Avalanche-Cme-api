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
var ClockConfig = require('./ClockConfig');
var NetConfig = require('./NetConfig');

var classNames = require('classnames');
var assign = require('object-assign'); // ES6 polyfill

var ConfigPanel = React.createClass({

	render: function () {
		var config = this.props.config;

		return (
			<div className="panel" id="config">
				<div className="title">Configuration</div>

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
				
				<ClockConfig config={config.clock} />

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

			</div>
		);
	},

	_requestChange: function(e) {
		var obj = {};
		obj[e.target.name] = e.target.value;
		Actions.config(obj);
	}
});

module.exports = ConfigPanel;
