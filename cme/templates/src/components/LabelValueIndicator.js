/**
 * LabelValueIndicator.js
 * james.brunner@kaelus.com
 *
 * A string indicator which uses a label for the name.
 */

var LabelValueIndicator = React.createClass({

	render: function () {
		return (
			<div className="lvi">
				<label>
					<span>{this.props.item.name}</span>
					<span className='sep'>:</span>
				</label>
				<span>{this.props.item.value}</span>
			</div>
		);
	}
});

module.exports = LabelValueIndicator;