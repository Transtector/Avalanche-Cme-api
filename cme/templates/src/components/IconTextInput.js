/**
 * IconTextInput.js
 * james.brunner@kaelus.com
 *
 * A text input component which supports an icon based on its
 * symbol property.
 */



var ENTER_KEY_CODE = 13;

var IconTextInput = React.createClass({

	propTypes: {
		className: React.PropTypes.string,
		id: React.PropTypes.string,
		symbol: React.PropTypes.string,
		placeholder: React.PropTypes.string,
		value: React.PropTypes.string
	},

	getInitialState: function() {
		return {
			value: this.props.value || '',
			symbol: this.props.symbol || 'settings'
		};
	},

	render: function() /*object*/ {
		var iconClass = 'icontextinput icon-' + this.state.symbol;

		return (
			<div className={iconClass}>
				<input
					className={this.props.className}
					id={this.props.id}
					placeholder={this.props.placeholder}
					onChange={this._onChange}
					onKeyDown={this._onKeyDown}
					value={this.state.value}
					autoFocus={true}
				/>
			</div>
		);
	},

	_onChange: function(/*object*/ event) {
		this.setState({
			value: event.target.value
		});
	},

	_onKeyDown: function(event) {
		if (event.keyCode === ENTER_KEY_CODE) {

		}
	}

});

module.exports = IconTextInput;