/**
 * CmeCalibrate.jsx
 * james.brunner@kaelus.com
 *
 * CME Calibrate page component.  Provides a wrapper to the channel calibration
 * API.  Note that calibration only works from Recovery Mode. 
 */
var React = require('react');
var CmeAPI = require('../CmeAPI');

var $ = require('jquery');

// loads the page's query string into an object, qs
var qs = (function(a) {
	if (a == "") return {};
	var b = {};
	for (var i = 0; i < a.length; ++i)
	{
		var p=a[i].split('=', 2);
		if (p.length == 1)
			b[p[0]] = "";
		else
			b[p[0]] = decodeURIComponent(p[1].replace(/\+/g, " "));
	}
	return b;
})(window.location.search.substr(1).split('&'));

var moment = require('moment');
var utils = require('../CmeApiUtils');

function error(e) {

	alert("Something bad happened: \n\n    " + e);
}

function isNumeric(n) { return !isNaN(parseFloat(n)) && isFinite(n); }


var CmeCalibrate = React.createClass({

	_cache: {
		device: null,
		channels: []
	},

	getInitialState: function () {
		return {
			device: null,
			channels: [],
			activeDevTabIndex: 0,
			activeChTabIndex: 0
		};
	},
	
	componentDidMount: function() {

		var _this = this;

		// read device info
		CmeAPI.device()
			.done(function(d) {
				_this._cache.device = d['device'];
				_this.setState({ device: _this._validateDevice(d['device']) });

				// Send a request to populate the data array for the identified channel.
				// We're not using the Action & Store to monitor channel data, however, as it
				// will continue to update on the parent page.  Here we'll just use the
				// CmeAPI call directly, and process the return.
				CmeAPI.channels()
					.done(function(chs) {
						chs['channels'].forEach(function(ch) {
							CmeAPI.channelConfig(ch)
								.done(function(ch_cfg){
									ch_cfg['id'] = ch;
									_this._cache.channels.push(ch_cfg);
									_this._cache.channels.sort(function(a, b) {
										return parseInt(a.id.slice(2)) - parseInt(b.id.slice(2));
									});
									_this.setState({ channels: _this._validateChannels(_this._cache.channels) });
								})
								.fail(error);
						});
					})
					.fail(error);
			})
			.fail(error);
	},

	render: function() {
		if (!this.state.device)
			return <div className='loaderWrapper'><div className='loader'>Loading...</div></div>;

		var changesPending = this._checkDeviceChanged();

		changesPending |= this._checkChannelsChanged();

		var disableSubmit = !changesPending || this._anyInvalid(this.state.device) || this._anyInvalid(this.state.channels);

		return (
			<div className="calibrate">

				<h2>CME Factory Calibration<span className={changesPending ? '' : 'hidden'}>*</span></h2>
				<hr />

				<div className="section">
					<h3 id="one">Device</h3>

					<div className="section-content">

						<div className="tabs">

							<div className="tab">
								<input type="radio" id='tab-0' name='tab-group-0' checked={this.state.activeDevTabIndex == 0} onChange={this._activateDevTab} />
								<label className={"tab-label" + (this.state.device.cme.unlocked ? '' : ' icon-lock')} 
									title={this.state.device.cme.unlocked ? '' : 'This information set by device OEM'}
									htmlFor='tab-0'>CME</label>

								<div className="tab-panel">
									<div className="tab-content">

										<div className="lineitem">
											<label htmlFor="cme.modelNumber">Model Number</label>
											<input type="text" id="cme.modelNumber" name="cme.modelNumber" 
												placeholder="Model Number" value={this.state.device.cme.modelNumber} 
												className={this.state.device.cme.modelNumber_invalid ? 'error' : ''}
												onChange={this._deviceChange} readOnly={!this.state.device.cme.unlocked} />
										</div>
										<div className="lineitem">
											<label htmlFor="cme.serialNumber">Serial Number</label>
											<input type="text" id="cme.serialNumber" name="cme.serialNumber" 
												placeholder="Serial Number" value={this.state.device.cme.serialNumber}
												className={this.state.device.cme.serialNumber_invalid ? 'error' : ''}
												onChange={this._deviceChange} readOnly={!this.state.device.cme.unlocked} />
										</div>
										<div className="lineitem">
											<label htmlFor="cme.dateCode">Date Code</label>
											<input type="text" id="cme.dateCode" name="cme.dateCode" 
												placeholder="Date Code" value={this.state.device.cme.dateCode}
												className={this.state.device.cme.dateCode_invalid ? 'error' : ''} 
												onChange={this._deviceChange} readOnly={!this.state.device.cme.unlocked} />
										</div>
										<div className="lineitem">
											<label htmlFor="cme.firmware">Firmware</label>
											<input type="text" id="cme.firmware" name="cme.firmware" 
												value={this.state.device.cme.firmware} readOnly="true" />
										</div>
									</div>
								</div>
							</div>

							<div className="tab">
								<input type="radio" id='tab-1' name='tab-group-0' checked={this.state.activeDevTabIndex == 1} onChange={this._activateDevTab} />
								<label className="tab-label" htmlFor='tab-1'>Host</label>

								<div className="tab-panel">
									<div className="tab-content">
										<div className="lineitem">
											<label htmlFor="host.modelNumber">Model Number</label>
											<input type="text" id="host.modelNumber" name="host.modelNumber"
												placeholder="Model Number" value={this.state.device.host.modelNumber} 
												className={this.state.device.host.modelNumber_invalid ? 'error' : ''}
												onChange={this._deviceChange} />
										</div>
										<div className="lineitem">
											<label htmlFor="host.serialNumber">Serial Number</label>
											<input type="text"  id="host.serialNumber" name="host.serialNumber" 
												placeholder="Serial Number" value={this.state.device.host.serialNumber}
												className={this.state.device.host.serialNumber_invalid ? 'error' : ''}
												onChange={this._deviceChange} />
										</div>
										<div className="lineitem">
											<label htmlFor="host.dateCode">Date Code</label>
											<input type="text"  id="host.dateCode" name="host.dateCode" 
												placeholder="Date Code" value={this.state.device.host.dateCode} 
												className={this.state.device.host.dateCode_invalid ? 'error' : ''}
												onChange={this._deviceChange} />
										</div>
									</div>
								</div>
							</div>

						</div>

					</div>
				</div>

				<div className="section">
					<h3 id="two">Channels</h3>

					<div className="section-content">
						<div className="tabs">
						{
							this.state.channels.map(function(ch, i) {
								return this._renderChannelTab(ch, i);
							}, this)
						}
						</div>
					</div>
				</div>

				<div className="section">
					<h3 id="three">Update</h3>

					<div className="section-content">
						<div className="buttons">
							<button className='btn' onClick={this._reset}>Reset</button>
							<button className='btn' disabled={disableSubmit} onClick={this._submit}>Submit</button>
						</div>
					</div>
				</div>
			</div>
		);
	},

	_renderChannelTab: function(ch, index) {

		// Users can set these sensor attributes currently:
		//		Range [null, null] (min, max; numbers) : used in the threshold UI displays which will NOT be shown w/o a defined range
		//		Threshold [0] (number) : sensor value reads return 0 if not above the threshold value
		//		Scale [1] (number) : sensor value multiplier used to scale/calibrate the raw sensor value 

		return (
			<div key={ch.id} className="tab">
				<input type="radio" id={'tab-1-' + index} name='tab-group-1' checked={this.state.activeChTabIndex == index} onChange={this._activateTab} />
				<label className="tab-label" htmlFor={'tab-1-' + index}>{ch.id}</label>

				<div className="tab-panel">
					<div className="tab-content">

						{/*<div className="lineitem">
							<label htmlFor="ch_id">Channel</label>
							<input type="text"  id="ch_id" name="ch_id" value={ch.id} readOnly="true" />
						</div>*/}
					
						<div className="lineitem">
							<label htmlFor="bus_type">Bus Type</label>
							<input type="text"  id="bus_type" name="bus_type" value={ch.bus_type} readOnly="true" />
						</div>
						<div className="lineitem">
							<label htmlFor="bus_index">Bus Index</label>
							<input type="text"  id="bus_index" name="bus_index" value={ch.bus_index} readOnly="true" />
						</div>
						<div className="lineitem">
							<label htmlFor="device_type">Device Type</label>
							<input type="text"  id="device_type" name="device_type" value={ch.device_type} readOnly="true" />
						</div>
						<div className="lineitem">
							<label htmlFor="device_index">Device Index</label>
							<input type="text"  id="device_index" name="device_index" value={ch.device_index} readOnly="true" />
						</div>

						<hr />
						<h4>Sensors</h4>

						{
							Object.values(ch.sensors).map(function (s, i) {

								var prefix = ch.id + '.' + s.id;

								return (
									<div key={prefix} className="sensor">
										<h5>{s.id}</h5>

										<div className="lineitem">
											<label htmlFor={s.id + ".type"}>Type</label>
											<input type="text"  id={s.id + ".type"} name={s.id + ".type"}
												value={s.type} readOnly="true" />
										</div>
										<div className="lineitem">
											<label htmlFor={s.id + ".units"}>Units</label>
											<input type="text"  id={s.id + ".units"} name={s.id + ".units"}
												value={s.units} readOnly="true" />
										</div>
										<div className="lineitem">
											<label htmlFor={prefix + ".range.min"}>Range</label>
											<input type="text" className={'short' + (s.range_invalid ? ' error' : '')}
												id={prefix + ".range.min"} name={prefix + ".range.min"} 
												value={s.range[0] != null ? s.range[0] : ''} onChange={this._channelChange} />
											<input type="text" className={'short' + (s.range_invalid ? ' error' : '')}
												id={prefix + ".range.max"} name={prefix + ".range.max"} 
												value={s.range[1] != null ? s.range[1] : ''} onChange={this._channelChange} />
										</div>
										<hr />
										<div className="lineitem">
											<label htmlFor={s.id + ".register"}>Register</label>
											<input type="text"  id={s.id + ".register"} name={s.id + ".register"}
												value={s.register} readOnly="true" />
										</div>
										<div className="lineitem">
											<label htmlFor={prefix + ".threshold"}>Threshold</label>
											<input type="text"  id={prefix + ".threshold"} name={prefix + ".threshold"} 
												className={s.threshold_invalid ? 'error' : ''} readOnly={s.type == 'PIB'}
												value={s.threshold} onChange={this._channelChange} />
										</div>
										<div className="lineitem">
											<label htmlFor={prefix + ".scale"}>Scale</label>
											<input type="text"  id={prefix + ".scale"} name={prefix + ".scale"} 
												className={s.scale_invalid ? 'error' : ''}  readOnly={s.type == 'PIB'}
												value={s.scale} onChange={this._channelChange} />
										</div>

									</div>
								)
							}, this)
						}
					</div>
				</div>
			</div>
		)
	},

	_checkDeviceChanged: function() {
		return JSON.stringify(this._cache.device) != JSON.stringify(this.state.device);
	},

	_checkChannelsChanged: function() {
		return this.state.channels.some(function(ch) {
			var changes = false,
				changed = [];

			
			var cached_ch = this._cache.channels.find(function(cch) {
				return ch.id == cch.id;
			});
			
			if (!cached_ch) return true;

			// Channel attributes to check
			changes = ['bus_index', 'bus_type', 'device_index', 'device_type'].some(function(attr) {
				return ch[attr] != cached_ch[attr];
			});

			changes |= Object.values(ch.sensors).some(function(s) {
				var cached_s = Object.values(cached_ch.sensors).find(function(cs){
					return s.id == cs.id;
				});

				if (!cached_s) return true;

				return ['type', 'units', 'scale', 'threshold', 'range', 'register'].some(function(attr) {
					if (attr == 'range') {
						return [0, 1].some(function(r){
							return s[attr][r] != cached_s[attr][r];
						});
					}

					if (s[attr] != cached_s[attr])
						changed.push(s.id + ':' + attr);
					return s[attr] != cached_s[attr];
				});
			});

			return changes;
		}, this);
	},

	_activateTab: function(e) {

		this.setState({ activeChTabIndex: parseInt(e.target.id.split('-')[2]) });
	},

	_activateDevTab: function(e) {

		this.setState({ activeDevTabIndex: parseInt(e.target.id.split('-')[1]) });
	},

	_reset: function() {

		this.setState({ 
			device: this._validateDevice(this._cache.device), 
			channels: this._validateChannels(this._cache.channels)
		});
	},

	_submit: function() {

		if (confirm('Are you sure?\n\nAfter the device and channel information is written, the CME will be rebooted.\n')) {
			alert('Sorry, this feature not yet implemented!');
		}
	},

	_deviceChange: function(e) {
		// e.g., e.target.id = 'host.modelNumber'
		var device = Object.assign({}, this.state.device),
			group = e.target.id.split('.')[0], // e.g., 'host'
			item = e.target.id.split('.')[1], // e.g., 'modelNumber'
			obj = {};

		obj[item] = e.target.value;
		device[group] = Object.assign({}, this.state.device[group], obj);

		// update device and set new state
		this.setState({ device: this._validateDevice(device) });
	},

	_channelChange: function(e) {
		var channels = [],
			chId = e.target.id.split('.')[0], // ch0
			sId = e.target.id.split('.')[1], // s0
			a = e.target.id.split('.')[2], // range, threshold, scale
			v = e.target.value;

		channels = this.state.channels.map(function(ch) {
			var newCh = $.extend(true, {}, ch);
			newCh.sensors = [];

			newCh.sensors = ch.sensors.map(function(s) {
				var newS = $.extend(true, {}, s);

				if (ch.id == chId && s.id == sId) {
					if (a !== 'range') {
						newS[a] = v;
					} else {
						var d = e.target.id.split('.')[3] == 'min' ? 0 : 1; // min or max
						newS['range'][d] = v;
					}
				}
				return newS;
			});
			return newCh;
		})

		this.setState({ channels: this._validateChannels(channels) });
	},

	_validateDevice: function(device) {
		if (!device) return device;

		// Return the device object with additional attributes
		// for each problem value as "item_invalid".
		for (var item in device['cme']){
			if (!device['cme'][item])
				device['cme'][item + '_invalid'] = true;
			else
				delete device['cme'][item + '_invalid'];
		}

		return device;
	},

	_validateChannels: function(channels) {
		// Currently we're only allowing range, threshold, and scale
		// to be set and they must all be numerics.
		return channels.map(function(ch) {
			var newCh = $.extend(true, {}, ch);

			newCh.sensors = [];
			newCh.sensors = Object.values(ch.sensors).map(function (s) {
				var newS = $.extend(true, {}, s);

				if ((!newS.range || newS.range.length !== 2 || !isNumeric(newS.range[0]) || !isNumeric(newS.range[1])) ||
					(isNumeric(newS.range[0]) && isNumeric(newS.range[1]) && parseFloat(newS.range[0]) >= parseFloat(newS.range[1])))
					
					newS['range_invalid'] = true;

				else
					delete newS['range_invalid'];

				if (!isNumeric(newS.threshold) && newS.type != 'PIB')
					newS['threshold_invalid'] = true;
				else
					delete newS['threshold_invalid'];

				if (!isNumeric(newS.scale) && newS.type != 'PIB')
					newS['scale_invalid'] = true;
				else
					delete newS['scale_invalid'];

				return newS;
			});

			return newCh;
		});
	},

	_anyInvalid: function(obj) {
		// This function handles arrays and objects returns true
		// if any "key_invalid" keys are found.
		for (var k in obj) {	
			if (typeof obj[k] == "object" && obj[k] !== null) {
				if (this._anyInvalid(obj[k]))
					return true;
			}
			if (/_invalid$/.test(k))
				return true;
		}
		return false;
	}
});

module.exports = CmeCalibrate;