# This is the CME running configuration handler.  CME configuration
# settings are loaded from settings.json and may override the default
# values in config.py.  To reset all configuration values to default,
# simply delete the settings.json file.

from cme import app

# simple dictionary to json file persistence
from cme.util.DictPersistJSON import DictPersistJSON
settings = DictPersistJSON(app.config['SETTINGS'])

# username and passhash - prepend double underscore to prevent
# them from displaying through the /api/config route
settings['__username'] = settings.get('__username', app.config['USERNAME'])
settings['__passhash'] = settings.get('__passhash', app.config['PASSHASH'])


# user-defined channels attributes
settings['__channels'] = settings.get('__channels', {})


# hide device from regular /config requests, but keep a copy
# in settings for easy access
settings['__device'] = {
	'modelNumber': app.config['DEVICE_MODEL_NUMBER'],
	'serialNumber': app.config['DEVICE_SERIAL_NUMBER'],
	'firmware': app.config['DEVICE_FIRMWARE'],
	'__update': None, # refreshed at init and whenever /device read
	'__updateTrigger': False
}

settings['general'] = settings.get('general', {
	'name': app.config['GENERAL_NAME'],
	'description': app.config['GENERAL_DESCRIPTION'],
	'location': app.config['GENERAL_LOCATION']
})

settings['support'] = settings.get('support', {
	'contact': app.config['SUPPORT_CONTACT'],
	'email': app.config['SUPPORT_EMAIL'],
	'phone': app.config['SUPPORT_PHONE']
})

settings['clock'] = settings.get('clock', {
	'zone': app.config['CLOCK_ZONE_OFFSET'],
	'ntp': app.config['CLOCK_USE_NTP'],
	'servers': app.config['CLOCK_NTP_SERVERS'],
	'status': [], # updated on reads

	# UI-related clock settings
	'displayRelativeTo': app.config['CLOCK_DISPLAY_RELATIVE_TO'],
	'display12HourTime': app.config['CLOCK_DISPLAY_12HOUR'],
	'displayDateFormat': app.config['CLOCK_DISPLAY_DATE_FORMAT'],
	'displayTimeFormat24Hour': app.config['CLOCK_DISPLAY_24HOUR_FORMAT'],
	'displayTimeFormat12Hour': app.config['CLOCK_DISPLAY_12HOUR_FORMAT']
})

settings['temperature'] = settings.get('temperature', {
	'displayUnits': app.config['TEMPERATURE_DISPLAY_UNITS'],
	'warningTemp': app.config['TEMPERATURE_WARNING_TEMP'],
	'alarmTemp': app.config['TEMPERATURE_ALARM_TEMP']
})

settings['snmp'] = settings.get('snmp', {
	'mib': None # GET request CME-MIB.txt download
})

settings['http'] = settings.get('http', {
	'corsWhitelist': [ "192.168.*" ]
})

settings['network'] = settings.get('network', {
	'mac': '', # forced from config, see below
	'dhcp': app.config['DHCP'],
	'address': app.config['ADDRESS'],
	'netmask': app.config['NETMASK'],
	'gateway': app.config['GATEWAY'],
	'primary': app.config['PRIMARY'],
	'secondary': app.config['SECONDARY']
})
settings['network']['mac'] = app.config['MAC']
