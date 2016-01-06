/**
 * TextInput.jsx
 * james.brunner@kaelus.com
 *
 * Generic text input field wrapper.
 */
var React = require('react');

var classNames = require('classnames');

var TextInput = React.createClass({

	propTypes: {
		id: React.PropTypes.string.isRequired
	},

	render: function() {
		var id = this.props.id,
			value = this.props.value,
			placeholder = this.props.placeholder || id.charAt(0).toUpperCase() + id.slice(1),
			caption = this.props.caption || placeholder,
			type = this.props.type || "text",
			onChange = this.props.onChange,
			onBlur = this.props.onBlur,
			readonly = !(onChange || onBlur),
			cn = classNames('input-group-cluster', this.props.className);

		return (
			<div className={cn}>
				<label htmlFor={id}>{caption}</label>
				<input
					type={type}
					name={id}
					id={id}
					placeholder={placeholder}
					value={value}
					disabled={this.props.disabled}
					onChange={onChange}
					onBlur={onBlur}
					readOnly={readonly}
				/>
			</div>
		);
	}
});

module.exports = TextInput;
