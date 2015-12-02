/**
 * TextInput.js
 * james.brunner@kaelus.com
 *
 * Generic text input field wrapper.
 */
var React = require('react');

var classNames = require('classnames');

var CheckboxInput = React.createClass({

	propTypes: {
		id: React.PropTypes.string.isRequired
	},

	render: function() {
		var id = this.props.id,
			checked = this.props.checked,
			placeholder = this.props.placeholder || id.charAt(0).toUpperCase() + id.slice(1),
			onChange = this.props.onChange,
			cn = classNames('checkboxinput', this.props.className);

		return (
			<div className={cn}>
				<label htmlFor={id}>{placeholder}</label>
				<input
					type="checkbox"
					name={id}
					id={id}
					placeholder={placeholder}
					checked={checked}
					onChange={onChange}
				/>
			</div>
		);
	}
});

module.exports = CheckboxInput;
