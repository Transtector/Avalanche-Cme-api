/**
 * InputGroup.jsx
 * james.brunner@kaelus.com
 *
 * Component to group controls and show/hide them.
 */
var React = require('react');

var classNames = require('classnames');

var _initialRender = true;

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

	render: function() {
		var capitalizedId = this.props.id.charAt(0).toUpperCase() + this.props.id.slice(1);
		var cn = classNames({'input-group': true, 'collapsed': this.state.collapsed});

		if (!_initialRender && this.state.collapsed && typeof this.props.onCollapse == 'function')
			this.props.onCollapse();
		else if (!_initialRender && typeof this.props.onExpand == 'function')
			this.props.onExpand();

		_initialRender = false;

		return (
			<div className={cn} id={this.props.id}>
				<div className="input-group-title">
					<button className='btn' onClick={this._onClick} />
					{capitalizedId}
				</div>
				<div className="input-group-content">
					{this.props.children}
				</div>
			</div>
		);
	},

	_onClick: function() {
		this.setState({ collapsed: !this.state.collapsed });
	}
});

module.exports = InputGroup;