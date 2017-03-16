/*
 * Header.jsx
 * james.brunner@kaelus.com
 *
 * Cme web application header.
 *
 */

var React = require('react');

var Constants = require('../Constants');
var Actions = require('../Actions');
var Store = require('../Store');

var Clock = require('./Clock');
//var Thermometer = require('./Thermometer');

var key = require('../keymaster/keymaster.js');
var classNames = require('classnames');

var Header = React.createClass({

	getInitialState: function () {
		var cmeState = Store.getState();

		return {
			device: cmeState.device,
			config: cmeState.config,
			ui_panel: cmeState.ui_panel,
			pollClock: -1,
			pollTemp: -1
		}

	},

	componentDidMount: function() {
		Store.addChangeListener(Constants.UI_PANEL, this._onUiPanelChange);		
		Store.addChangeListener(Constants.DEVICE, this._onDeviceChange);
		Store.addChangeListener(Constants.CONFIG, this._onConfigChange);

		if (this.props.isLoggedIn) {
			this.setState({ pollClock: 1000, pollTemp: 10000 });
		}

		// register keypress handler for shift + underscore to
		// toggle the clock and thermometer polling
		key('ctrl+8, ⌘+8', this._toggleWidgetPolling);
	},

	componentWillReceiveProps: function(nextProps) {
		if (nextProps.isLoggedIn) {
			this.setState({ pollClock: 1000, pollTemp: 10000 });
		} else {
			this.setState({ pollClock: -1, pollTemp: -1 });
		}
	},

	componentWillUnmount: function() {
		key.unbind('ctrl+8, ⌘+8');

		Store.removeChangeListener(Constants.UI_PANEL, this._onUiPanelChange);
		Store.removeChangeListener(Constants.DEVICE, this._onDeviceChange);
		Store.removeChangeListener(Constants.CONFIG, this._onConfigChange);
	},

	render: function () {

		var model = '', 
			serial = '',
			firmware = '',
			standAlone = true;

		if (this.state.device && this.state.device.cme) {
			model = this.state.device.cme.modelNumber;
			serial = this.state.device.cme.serialNumber;
			firmware = this.state.device.cme.firmware;
		}

		// overwrite model/serial number for the UI if there is host info available
		if (this.state.device && this.state.device.host) {
			model = this.state.device.host.modelNumber || model;
			serial = this.state.device.host.serialNumber || serial;
			standAlone = !this.state.device.host.modelNumber;  // indicate "stand-alone" device if no host model number
		}

		var dashButtonCls = classNames('btn', 'icon-dashboard', { 'active': this.state.ui_panel == 'dashboard'});
		var alarmButtonCls = classNames('btn', 'icon-alarm', { 'active': this.state.ui_panel == 'alarms'});
		var configButtonCls = classNames('btn', 'icon-settings', { 'active': this.state.ui_panel == 'settings'});

		var recoveryCls = classNames('recovery', { 'hidden': !this.state.device.recovery });

		var brandName = 'CME';
		if (this.state.config && this.state.config.general)
			brandName = this.state.config.general.name;

		return (
			<header>
				<div className="tab">&nbsp;</div>

				<div className="branding">
					<div className="title">
						{brandName}<span title='This is a stand-alone CME (no host)' className={standAlone ? 'stand-alone' : 'hidden'}>*</span>
					</div>
					<div className="model">{model}</div>
				</div>

				<div className={recoveryCls}>RECOVERY MODE</div>

				<div className="info">
					<div>
						<label><span>Serial number</span><span className='separator'>:</span></label>
						<span>{serial}</span>
					</div>
					<div>
						<label><span>Version</span><span className='separator'>:</span></label>
						<span>{firmware}</span>
					</div>
				</div>

				<div className='widgets'>
					<Clock config={this.state.config.clock} flavor='widget' pollPeriod={this.state.pollClock} />
					{/*<Thermometer config={this.state.config.temperature} flavor='widget' pollPeriod={this.state.pollTemp} />*/}
				</div>
				
				<div className="buttons">
					{this.props.isLoggedIn ? <button className={dashButtonCls} title="Show dashboard" name="dashboard" onClick={this._showPanel}>Dashboard</button> : null}
					{this.props.isLoggedIn ? <button className={alarmButtonCls} title="Show alarms" name="alarms" onClick={this._showPanel}>Alarms</button> : null}
					{this.props.isLoggedIn ? <button className={configButtonCls} title="Show settings" name="settings" onClick={this._showPanel}>Settings</button> : null}
					{this.props.isLoggedIn ? <button className="btn icon-logout" title="Logout" onClick={this._logout}>Logout</button> : null}
				</div>

			</header>
		);
	},

	_onUiPanelChange: function() {

		this.setState({ ui_panel: Store.getState().ui_panel });
	},

	_onSessionChange: function() {
		//console.log("Header got onSessionChange event");
		this.setState({ isLoggedIn: Store.getState().isLoggedIn });
	},

	_onDeviceChange: function() {
		//console.log("Header got onDeviceChange event");
		this.setState({ device: Store.getState().device });
	},

	_onConfigChange: function() {

		this.setState({ config: Store.getState().config });
	},

	_toggleWidgetPolling: function(e, handler) {
		//console.log("Clock and Thermometer polling toggled: ", handler.shortcut);

		this.setState({ 
			pollClock: this.state.pollClock < 0 ? 1000 : -1,
			pollTemp: this.state.pollTemp < 0 ? 10000 : -1 
		});
		return false;
	},

	_showPanel: function(e) {
		var panel = e.target.name;
		Actions.ui(panel);
	},
	
	_logout: function () {

		this.setState({ pollClock: -1, pollTemp: -1 }, function () { 
			Actions.logout();
		});
	}
});

module.exports = Header;