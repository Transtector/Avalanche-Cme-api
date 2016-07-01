/**
 * InputGroup.jsx
 * james.brunner@kaelus.com
 *
 * Component to group controls and show/hide them.
 */
'use strict';

var React = require('react');

var classNames = require('classnames');

var InputGroup = React.createClass({

	propTypes: {
		id: React.PropTypes.string.isRequired,
		onExpand: React.PropTypes.func,
		onCollapse: React.PropTypes.func
	},

	getInitialState: function() {
		return {
			collapsed: true
		}
	},

	collapse: function() {
		var _this = this;
		this.setState({ collapsed: true }, function () {
			if (_this.props.onCollapse)
				_this.props.onCollapse();
		});
	},

	expand: function() {
		var _this = this;
		this.setState({ collapsed: false }, function () {
			if (_this.props.onExpand)
				_this.props.onExpand();
		});
	},

	render: function() {
		var capitalizedId = this.props.id.charAt(0).toUpperCase() + this.props.id.slice(1);
		var cn = classNames({'input-group': true, 'collapsed': this.state.collapsed});

		return (
			<div className={cn} id={this.props.id}>
				<div className="input-group-title">
					<button className='btn' onClick={this._onClick}>
						{capitalizedId}
					</button>
				</div>
				<div className="input-group-content">
					{this.props.children}
				</div>
			</div>
		);
	},

	_onClick: function() {
		if (this.state.collapsed)
			this.expand();
		else
			this.collapse();
	}
});

module.exports = InputGroup;