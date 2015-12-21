module.exports = exports = {

	// This lookup defined in settings.py on the server side.
	// Needs update if changes are made there.
	TIME_DISPLAY: {
		UTC: 0,
		CME_LOCAL: 1,
		LOCAL: 2
	},

	formatRelativeMoment: function (moment, relativeTo, zone) {

		if (relativeTo == this.TIME_DISPLAY.CME_LOCAL)
			return moment.utcOffset(zone * 60);

		if (relativeTo == this.TIME_DISPLAY.LOCAL)
			return moment.local();

		return moment.utcOffset(0);
	}
}
