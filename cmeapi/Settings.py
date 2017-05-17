from .common.DictPersistJSON import DictPersistJSON
from .common.ClockUtils import check_ntp, ntp_servers
from .common.IpUtils import mac, dhcp, address, netmask, gateway
from .common import Config

''' User settings are cached in an external file 'settings.json'.  Import
	the Settings.py module and pass it through this class constructor to
	update the default values below.  Simply delete the settings.json file
	to return values to their factory defaults.

	Access USER_SETTINGS like this:

		from .common import Config
		user_setting = Config.API.USER_SETTINGS['user_setting_key']

	*Note: if you want to save a USER_SETTING that's part of
	a dict itself (e.g., GENERAL > NAME), then you have to 
	write the enire object.

	I.e., do this to make changes that get saved to disk:

		general = Config.API.USER_SETTINGS['GENERAL']
		general['NAME'] = 'My cool new name'
		Config.API.USER_SETTINGS['GENERAL'] = general


	*Note: Use an underscore character on items that you DON'T
	want to get serialized (e.g., to API respones).  For example
	the username and passhash are user settings, but we never
	want to serve them up as part of a response, so we prefix
	with underscores.
'''
USER_SETTINGS = DictPersistJSON(Config.PATHS.SETTINGS, {

	'__username': Config.API.USERNAME,
	'__passhash': Config.API.PASSHASH,
	'__device': Config.INFO.DEVICE,

	'general': {
		'name': 'CME',
		'description': 'Core monitoring engine',
		'location': '',
		'sitecode': ''
	},

	'support': {
		'contact': '',
		'email': '',
		'phone': ''
	},

	'temperature': {
		'displayUnits': Config.TemperatureUnits.CELSIUS,
		'warningTemp': 65, # ºC
		'alarmTemp': 80 # ºC
	},

	'clock': {
		'ntp': check_ntp(),
		'servers': ntp_servers(),
		'status': [],
		'zone': 0,
		'displayRelativeTo': Config.RelativeTo.UTC,
		'display12Hour': False,
		'displayDateFormat': "YYYY-MM-DD",
		'displayTimeFormat24Hour': "HH:mm:ss",
		'displayTimeFormat12Hour': "h:mm:ss A"
	},

	'network': {
		'mac': mac(),
		'dhcp': dhcp(),
		'address': address(),
		'netmask': netmask(),
		'gateway': gateway(),
		'primary': '8.8.4.4',
		'secondary': '8.8.8.8'
	}
})
