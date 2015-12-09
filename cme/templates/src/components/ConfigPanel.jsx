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
var ClockConfig = require('./ClockConfig');
var NetConfig = require('./NetConfig');

var classNames = require('classnames');
var assign = require('object-assign'); // ES6 polyfill

var ConfigPanel = React.createClass({

	getInitialState: function () {

		var config = Store.getState().cme.config;

		return {
			general: config.general,
			support: config.support,
			http: config.http
		};
	},

	componentDidMount: function() {
		Store.addChangeListener(this._onChange);
	},

	componentWillUnmount: function() {
		Store.removeChangeListener(this._onChange);
	},

	render: function () {
		return (
			<div className="panel" id="config">
				<div className="title">Configuration</div>

				<InputGroup id="general">
					<TextInput id="name" value={this.state.general.name} onChange={this._requestChange} />
					<TextInput id="description" value={this.state.general.description} onChange={this._requestChange} />
					<TextInput id="location" value={this.state.general.location} onChange={this._requestChange} />
				</InputGroup>

				<InputGroup id="support">
					<TextInput id="contact" value={this.state.support.contact} onChange={this._requestChange} />
					<TextInput id="email" value={this.state.support.email} onChange={this._requestChange} />
					<TextInput id="phone"  value={this.state.support.phone} onChange={this._requestChange} />
				</InputGroup>

				<NetConfig />
				<ClockConfig />

				<InputGroup id="snmp">
					<div className="input-group-cluster">
						<label htmlFor="mib">MIB</label>
						<a id="mib" href="#nogo">Download MIB</a>
					</div>
				</InputGroup>

				<InputGroup id="http">
					<TextInput id="cors" 
						placeholder="CORS whitelist" 
						value={this.state.http.corsWhitelist} />
				</InputGroup>

			</div>
		);
	},

	_requestChange: function(e) {
		var obj = {};
		obj[e.target.name] = e.target.value;
		Actions.config(obj);
	},

	_onChange: function() {
		var config = Store.getState().cme.config;

		this.setState({
			general: config.general,
			support: config.support
		});
	}
});

module.exports = ConfigPanel;
