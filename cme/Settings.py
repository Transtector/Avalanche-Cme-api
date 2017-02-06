# This is the CME running configuration handler.  CME configuration
# settings are loaded from settings.json and may override the default
# values in Config.py.  To reset all configuration values to default,
# simply delete the settings.json file.

from . import Config

# simple dictionary to json file persistence
from .common.DictPersistJSON import DictPersistJSON

settings = DictPersistJSON(Config.SETTINGS)

# username and passhash - prepend double underscore to prevent
# them from displaying through the /api/config route
settings['__username'] = settings.get('__username', Config.USERNAME)
settings['__passhash'] = settings.get('__passhash', Config.PASSHASH)


# user-defined channels attributes
settings['__channels'] = settings.get('__channels', {})


# Hide device from regular /config requests, but keep a copy
# in settings for easy access.  Add the hidden update and
# updateTrigger keys.
settings['__device'] = Config.DEVICE_DATA
settings['__device'].update({
	'__update': None, # refreshed at init and whenever /device read
	'__updateTrigger': False
})

settings['general'] = settings.get('general', {
	'name': Config.GENERAL_NAME,
	'description': Config.GENERAL_DESCRIPTION,
	'location': Config.GENERAL_LOCATION
})

settings['support'] = settings.get('support', {
	'contact': Config.SUPPORT_CONTACT,
	'email': Config.SUPPORT_EMAIL,
	'phone': Config.SUPPORT_PHONE
})

settings['clock'] = settings.get('clock', {
	'zone': Config.CLOCK_ZONE_OFFSET,
	'ntp': Config.CLOCK_USE_NTP,
	'servers': Config.CLOCK_NTP_SERVERS,
	'status': [], # updated on reads

	# UI-related clock settings
	'displayRelativeTo': Config.CLOCK_DISPLAY_RELATIVE_TO,
	'display12HourTime': Config.CLOCK_DISPLAY_12HOUR,
	'displayDateFormat': Config.CLOCK_DISPLAY_DATE_FORMAT,
	'displayTimeFormat24Hour': Config.CLOCK_DISPLAY_24HOUR_FORMAT,
	'displayTimeFormat12Hour': Config.CLOCK_DISPLAY_12HOUR_FORMAT
})

settings['temperature'] = settings.get('temperature', {
	'displayUnits': Config.TEMPERATURE_DISPLAY_UNITS,
	'warningTemp': Config.TEMPERATURE_WARNING_TEMP,
	'alarmTemp': Config.TEMPERATURE_ALARM_TEMP
})

settings['snmp'] = settings.get('snmp', {
	'mib': None # GET request CME-MIB.txt download
})

settings['http'] = settings.get('http', {
	'corsWhitelist': [ "192.168.*" ]
})

settings['network'] = settings.get('network', {
	'mac': '', # forced from config, see below
	'dhcp': Config.DHCP,
	'address': Config.ADDRESS,
	'netmask': Config.NETMASK,
	'gateway': Config.GATEWAY,
	'primary': Config.PRIMARY,
	'secondary': Config.SECONDARY
})
settings['network']['mac'] = Config.MAC
