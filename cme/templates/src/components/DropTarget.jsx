/**
 * DropTarget.jsx
 * james.brunner@kaelus.com
 *
 * Makes a simple drop target for dragging/dropping things.
 */
 'use strict';

var React = require('react');

var DropTarget = React.createClass({

	getInitialState: function () {
		return { 
			isDragActive: false
		 };
	},

	propTypes: {
		onDrop: React.PropTypes.func.isRequired
	},

	onDragLeave: function(e) {
		this.setState({
			isDragActive: false
		});
	},

	onDragOver: function(e) {
		e.preventDefault();
		e.dataTransfer.dropEffect = 'copy';

		this.setState({
			isDragActive: true
		});
	},

	onDrop: function(e) {
		e.preventDefault();

		this.setState({
			isDragActive: false
		});

		var files;
		if (e.dataTransfer) {
			files = e.dataTransfer.files;
		} else if (e.target) {
			files = e.target.files;
		}

		if (this.props.onDrop) {
			this.props.onDrop(files);
		}
	},

	onClick: function () {
		
		this.refs['fileInput'].click();
	},

	render: function() {

		var className = 'drop-target';
		if (this.state.isDragActive) {
			className += ' active';
		};

		return (
			<div className={className}  onClick={this.onClick} onDragLeave={this.onDragLeave} onDragOver={this.onDragOver} onDrop={this.onDrop}>
				{/* The name='files[]' is important because the server pulls the file data by this name */}
				<input style={{display:'none'}} type='file' name='files[]' ref='fileInput' onChange={this.onDrop} />
				{this.props.children}
			</div>
		);
	  }

});


module.exports = DropTarget;