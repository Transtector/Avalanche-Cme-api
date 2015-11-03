# This is the CME running configuration handler.  CME configuration
# settings are loaded from settings.json and may override the default
# values in config.py.  To reset all configuration values to default,
# simply delete the settings.json file.

from cme import app
from cme.util import IpUtils

# simple dictionary to json file persistence
from cme.util.DictPersistJSON import DictPersistJSON
settings = DictPersistJSON(app.config['SETTINGS'])

# username and passhash - prepend double underscore to prevent
# them from displaying through the /api/config route
settings['__username'] = settings.get('__username', app.config['USERNAME'])
settings['__passhash'] = settings.get('__passhash', app.config['PASSHASH'])

settings['device'] = {
	'modelNumber': app.config['DEVICE_MODEL_NUMBER'],
	'serialNumber': app.config['DEVICE_SERIAL_NUMBER'],
	'firmware': app.config['DEVICE_FIRMWARE'],
	'update': None, # refreshed at init and whenever /device read
	'updateTrigger': False
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

settings['time'] = settings.get('time', {
	'current': '', # updated on init and reads
	'zone': app.config['TIME_ZONE_OFFSET'],
	'useNTP': app.config['TIME_USE_NTP'],
	'NTPServers': [], # updated from /etc/ntp.conf
	'NTPStatus': [] # updated on reads
})

settings['snmp'] = settings.get('snmp', {
	'mib': None # GET request CME-MIB.txt download
})

settings['http'] = settings.get('http', {
	'corsWhitelist': [ "192.168.*" ]
})

settings['network'] = settings.get('network', {
	'MAC': '', # set below
	'useDHCP': False, #
	'ipAddress': '192.168.1.30',
	'subnetMask': '255.255.255.0',
	'gateway': '192.168.1.1',
	'primaryDNS': '8.8.4.4',
	'secondaryDNS': '8.8.8.8'
})

settings['network']['MAC'] = IpUtils.mac()