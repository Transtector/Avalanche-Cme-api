/**
 * UpdatePanel.jsx
 * james.brunner@kaelus.com
 *
 * Handles software/firmware updates
 */
 'use strict';

var React = require('react');

var Constants = require('../Constants');
var Actions = require('../Actions');
var Store = require('../Store');

var InputGroup = require('./InputGroup');
var TextInput = require('./TextInput');
var DropTarget = require('./DropTarget');

var classNames = require('classnames');
var assign = require('object-assign'); // ES6 polyfill

var UpdatesPanel = React.createClass({

	_pollTimeout: null,
	_pollStartTime: 0,
	
	propTypes: {
		pollPeriod: React.PropTypes.number // how fast to poll in milliseconds
	},

	getDefaultProps: function() {
		return {
			pollPeriod: 10000
		}
	},
	
	getInitialState: function () {

		return { 
			updates: Store.getState().updates,
			progress: null,
			install: null,
			installing: false
		 };
	},

	componentDidMount: function() {
		Store.addChangeListener(Constants.UPDATES, this._onUpdatesChange);
		//this._startPoll();
	},

	componentWillUnmount: function() {
		this._stopPoll();
		Store.removeChangeListener(Constants.UPDATES, this._onUpdatesChange);
	},	

	render: function() {

		var pending = this.state.updates.pending || false; // false or name of update file

		// reset installing flag if we're rendering w/pending update
		if (pending && this.state.installing)
			this.setState({ installing: false });

		function renderUpdateRadioItem(self, id) {

			return (
				<label key={id} htmlFor={id}>
					<input type="radio" name='updateRadioItem'
							id={id}
							onChange={self._selectUpdate}
							checked={self.state.install == id} />
					{id.split('_')[1]}
				</label>
			);
		}

		var updateContent = (function(self, p) {

			if (p) {
				// pending updates have much simpler UI
				return (
					<div className='input-group-cluster no-border'>
						<label htmlFor='pending-update'>This update is ready</label>
						<input id='pending-update'
							type='text'
							value={p}
							readOnly='true' />

						<p>This update will be used after restarting the device. 
							Click Restart to proceed or Cancel to remove the update.</p>
					</div>
				);

			} else {

				var progressActive, progressVal;
				
				if (self.state.progress) {
					progressActive = 'active';
					progressVal = 100 * (self.state.progress.value / self.state.progress.max);
				}

				return (
					<div className='input-group-cluster no-border'>

						<label htmlFor='updates-list-usb'>External USB drive</label>
						<div id="updates-list-usb" className="radio-group">
							{self.state.updates.usb.length > 0
								? self.state.updates.usb.map(function(update) {
									return renderUpdateRadioItem(this, 'usb_' + update);
								}, self)
								: <p>Nothing found</p>
							}
						</div>

						<label htmlFor='updates-list-web'>From the web</label>
						<div id="updates-list-web" className="radio-group">
							{self.state.updates.web.length > 0
								? self.state.updates.web.map(function(update) {
									return renderUpdateRadioItem(this, 'web_' + update);
								}, self)
								: <p>Nothing found</p>
							}
						</div>
						
						<label htmlFor='updates-list-uploaded'>Uploaded</label>
						<div id="updates-list-uploaded" className="radio-group">
							{self.state.updates.uploads.map(function(update) {
								return renderUpdateRadioItem(this, 'upload_' + update);
							}, self)}
						</div>

						<div className='upload-widget'>
							<DropTarget onDrop={self._uploadFile}>
								<h1>Drag and drop or click here</h1>
								<h2>to upload an update (max 500 MiB)</h2>
							</DropTarget>

							 <progress className={progressActive} max="100" value={progressVal}>
            					{/* Browsers that support HTML5 progress element will ignore the html
            						inside `progress` element. Whereas older browsers will ignore the
            						`progress` element and instead render the html inside it. */}
            					<div class="progress-bar">
                					<span style={{ width: progressVal + '%' }}>{progressVal}%</span>
            					</div>
        					</progress>
						</div>
					</div>
				);
			}
		})(this, pending);

		var updateButtons = (function(self, p) {
			if (p) {
				return (
					<div className="input-group-buttons">
						<button className='btn' 
								onClick={self._onCancel}
								disabled={!p}>Cancel</button>

						<button className='btn' 
								onClick={self._onRestart}
								disabled={!p}>Restart</button>
					</div>
				);
			} else {
				return (
					<div className="input-group-buttons">
						<button className='btn full-width' 
								onClick={self._onInstall}
								disabled={!self.state.install || self.state.installing}>Install</button>
					</div>
				);				
			}
		})(this, pending);

		var screen = classNames({
			screen: true,
			active: this.state.installing
		});

		return (
			<InputGroup id="updates" 
				onExpand={this._startPoll} 
				onCollapse={this._stopPoll}>

				{updateContent}

				{updateButtons}

				<div className={screen}>&nbsp;</div>

			</InputGroup>
		);
	},

	_onUpdatesChange: function () {
		var _this = this;

		this.setState({ updates: Store.getState().updates }, function () {
			// Keep polling if we don't have pending update
			if (!_this.state.updates.pending  && _this._pollStartTime) {

				var age = moment().valueOf() - this._pollStartTime,
					period = (age >= _this.props.pollPeriod)
						? 0
						: _this.props.pollPeriod - (age % _this.props.pollPeriod)

				clearTimeout(_this._pollTimeout);
				_this._pollTimeout = null;
				_this._pollTimeout = setTimeout(_this._startPoll, period);
			}
		});
	},

	_startPoll: function () {
		this._pollStartTime = moment().valueOf();
		Actions.getUpdates();
	},

	_stopPoll: function () {
		this._pollStartTime = 0;
		clearTimeout(this._pollTimeout);
		this._pollTimeout = null;
	},

	_selectUpdate: function(e) {

		this.setState({ install: e.target.id });
	},

	_onCancel: function() {

		if (confirm("The pending update will be removed.\n\nOk to continue?\n\n")) {
			Actions.deleteUpdate();
		}
	},

	_onRestart: function() {
		if (confirm("You will be logged out and device will restart.\n\nOk to continue?\n\n")) {
			Actions.restart();
		}
	},

	_uploadFile: function(files) {

		// 	Using simple validation here:
		// 		only a single file (first is chosen)
		// 		name must match pattern: '1500-???-v*-SWARE-CME.tgz'
		//		max size 500 MB (500*1024*1024)

		var re = /1500\-[0-9]{3}\-v[0-9]+\.[0-9]+\.[0-9]+\-SWARE\-CME\.tgz/i;
		var max_size = 500 * 1024 * 1024; // 500 MiB (also checked on server)
				
		if (!files) return;

		// get the DOM form element and it's file input
		var formData = new FormData();

		// Fire an error message if any of these:
		// Note: files is a FileList not an array
		var err = '';
		for (var i = 0; i < files.length; i++) {
			if (err) break;

			if (!files[i].name.match(re)) {
				err = 'Invalid system update or update not supported on this platform.';
				break;
			}

			if (files[i].size > max_size) {
				err = 'File exceeds maximum size.';
				break;
			}

			// no errors - add to formData
			formData.append('files[]', files[i], files[i].name);
		}

		// if errors - just alert them and return
		if (err) {
			Actions.injectError(err);
			return;
		}

		// create a progress handler then do the upload
		var self = this;
		function onProgress(e) {
			if (e.lengthComputable) {
				self.setState({ progress: { value: e.loaded, max: e.total }});
			}
		}

		function onComplete() {
			// pause for effect...
			setTimeout(function () { self.setState({ progress: null })}, 1000);
		}

		Actions.uploadUpdate(formData, onProgress, onComplete);
	},

	_onInstall: function() {
		if (!this.state.install) return;

		this.setState({ installing: true });
		var source_name = this.state.install.split('_');

		Actions.installUpdate(source_name[0], source_name[1]);
	}

});

module.exports = UpdatesPanel;