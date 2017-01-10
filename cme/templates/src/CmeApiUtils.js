module.exports = exports = {

	// This lookup defined in config.py on the server side.
	// Needs update if changes are made there.
	TEMPERATURE_UNITS: {
		CELSIUS: 0,
		FAHRENHEIT: 1
	},

	formatTemperatureDisplay: function(celsius, units, digits) {
		if (!celsius) return -40;

		var value = (units == this.TEMPERATURE_UNITS.CELSIUS) 
			? celsius 
			: celsius * (9/5) + 32,
			
			unit = (units == this.TEMPERATURE_UNITS.CELSIUS) ? '°C' : '°F';

		return value.toFixed(digits) + ' ' + unit;
	},

	// This lookup defined in config.py on the server side.
	// Needs update if changes are made there.
	TIME_DISPLAY: {
		UTC: 0,
		CME_LOCAL: 1,
		LOCAL: 2
	},

	formatRelativeMoment: function (moment, relativeTo, zone_hours) {

		if (!moment) return moment;

		if (relativeTo == this.TIME_DISPLAY.CME_LOCAL) {
			var offset_minutes = zone_hours * 60;

			// Due to the way moment.utcOffset() interprets the parameter, we
			// have to adjust it back to the fractional zone_hours.
			// see: http://momentjs.com/docs/#/manipulating/utc-offset/
			if (offset_minutes < 16 && offset_minutes > -16)
				offset_minutes = zone_hours

			return moment.utcOffset(offset_minutes);
		}

		if (relativeTo == this.TIME_DISPLAY.LOCAL)
			return moment.local();

		return moment.utcOffset(0);
	},

	SENSOR_TYPE: {
		CAC: 'AC Current',
		VAC: 'AC Voltage'
	}
}
