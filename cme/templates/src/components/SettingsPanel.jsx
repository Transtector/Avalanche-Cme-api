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

var Clock = require('./Clock');
var Temp= require('./Thermometer');

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
					<div className="title">Device Settings</div>
					<div className="subtitle">Set behavior and informational fields</div>
				</div>

				<div className="panel-content">
				
					<UserConfig />

					<InputGroup title="General">
						<TextInput id="general.name" name='name' defaultValue={config.general.name} onBlur={this._requestChange} />
						<TextInput id="general.description" name='description' defaultValue={config.general.description} onBlur={this._requestChange} />
						<TextInput id="general.sitecode" name='site code' defaultValue={config.general.sitecode} onBlur={this._requestChange} />
						<TextInput id="general.location" name='device location' defaultValue={config.general.location} onBlur={this._requestChange} />
					</InputGroup>

					<InputGroup title="Support">
						<TextInput id="support.contact" name='contact' defaultValue={config.support.contact} onBlur={this._requestChange} />
						<TextInput id="support.email" name='email' defaultValue={config.support.email} onBlur={this._requestChange} />
						<TextInput id="support.phone"  name='phone' defaultValue={config.support.phone} onBlur={this._requestChange} />
					</InputGroup>

					<NetConfig config={config.network} />
					
					<Clock config={config.clock} flavor="config" pollPeriod={1000} />
					
					<Temp config={config.temperature} flavor="config" pollPeriod={10000} />

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

					<InputGroup title="Legal" id='legal'>
						<div>
							<p>The software components comprising the CME system are copyright &copy; 2017 
							Transtector Systems, Inc.</p>

							<p>Several unmodified software packages and libraries are used in the CME system.</p>

							<ul>
								<li><a href='https://www.debian.org/legal/licenses/'>Debian GNU/Linux</a> and component packages are released under terms of the common <a href='/legal/debian-linux/LICENSE.txt'>GNU General Public License</a>.</li>
								<li><a href='http://cherrypy.org/'>CherryPy</a> is distributed under a <a href='/legal/cherrypy/LICENSE.txt'>BSD license</a>.</li>
								<li><a href='http://flask.pocoo.org/'>Flask</a> is licensed under a three clause <a href='/legal/flask/LICENSE.txt'>BSD license</a>.</li>
								<li><a href='http://oss.oetiker.ch/rrdtool/'>RRDTool</a> is available under the terms of the <a href='/legal/rrdtool/LICENSE.txt'>GNU General Public License V2 or later</a>.</li>
								<li><a href='https://facebook.github.io/react/'>React</a> is distributed under the <a href='/legal/react/LICENSE.txt'>BSD license</a>.</li>								
								<li><a href='https://facebook.github.io/flux/'>Flux</a> is distributed under the <a href='/legal/flux/LICENSE.txt'>BSD license</a>.</li>
								<li><a href='https://jquery.com/'>jQuery</a> is provided under the <a href='/legal/jquery/LICENSE.txt'>MIT license</a>.</li>
								<li><a href='http://momentjs.com/'>Moment.js</a> is freely distributable under the terms of the <a href='/legal/moment/LICENSE.txt'>MIT license</a>.</li>
								<li><a href='https://github.com/YouCanBookMe/react-datetime'>react-datetime</a> is released under the <a href='/legal/react-datetime/LICENSE.md'>MIT license</a>.</li>
								<li><a href='https://github.com/JedWatson/classnames'>classnames</a> is released under the <a href='/legal/classnames/LICENSE.txt'>MIT license</a>.</li>
								<li><a href='http://crcmod.sourceforge.net/'>crcmod</a> Python module is released under the <a href='/legal/crcmod/LICENSE.txt'>MIT license</a>.</li>
								<li><a href='https://github.com/emn178/js-md5'>js-md5</a> project is released under the <a href='/legal/js-md5/LICENSE.txt'>MIT license</a>.</li>
								<li><a href='https://github.com/doceme/py-spidev'>spidev</a> Python project is licensed under the <a href='/legal/spidev/LICENSE.md'>GNU General Public License V2</a>.</li>
							</ul>
						</div>
					</InputGroup>

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
