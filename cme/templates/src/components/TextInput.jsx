/**
 * TextInput.jsx
 * james.brunner@kaelus.com
 *
 * Generic text input field wrapper.
 */
'use strict';

var React = require('react');

var classNames = require('classnames');


var TextInput = React.createClass({

	propTypes: {
		id: React.PropTypes.string.isRequired,
		name: React.PropTypes.string.isRequired
	},

	render: function() {
		var id = this.props.id,
			type = this.props.type || "text",
			name = this.props.name,

			onBlur = this.props.onBlur,
			readonly = !onBlur,

			cn = classNames('input-group-cluster', this.props.className);

		return (
			<div className={cn}>
				<label htmlFor={id}>{name}</label>
				<input ref='_input'
					id={id}
					type={type}
					name={name}
					placeholder={this.props.placeholder || name}

					defaultValue={this.props.defaultValue}
					disabled={this.props.disabled}

					onBlur={onBlur}
					readOnly={readonly}

					onKeyUp={this._blurOnEnter}
				/>
			</div>
		);
	},

	_blurOnEnter: function(e) {
		if (e.keyCode == 13) {
			this.refs['_input'].blur()
		}
	}
});

module.exports = TextInput;
