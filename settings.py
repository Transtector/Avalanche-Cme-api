# This is the CME running configuration handler.  CME configuration
# settings are loaded from settings.json and may override the default
# values in config.py.  To reset all configuration values to default,
# simply delete the settings.json file.

from cme import app

# simple dictionary to json file persistence
from cme.util.DictPersistJSON import DictPersistJSON
settings = DictPersistJSON("settings.json")

settings['username'] = settings.get('username', app.config['USERNAME'])

settings['passhash'] = settings.get('passhash', app.config['PASSHASH'])

settings['device'] = {
	'modelNumber': app.config['DEVICE_MODEL_NUMBER'],
	'serialNumber': app.config['DEVICE_SERIAL_NUMBER'],
	'firmware': app.config['DEVICE_FIRMWARE'],
	'update': None, # refreshed at init and whenever /device read
	'updateTrigger': False
}

settings['general'] = {
	'name': settings['general'].get('name', app.config['GENERAL_NAME']),
	'description': settings['general'].get('description', app.config['GENERAL_DESCRIPTION']),
	'location':settings['general'].get('location', app.config['GENERAL_LOCATION'])
}

settings['support'] = {
	'contact': app.config['SUPPORT_CONTACT'],
	'email': app.config['SUPPORT_EMAIL'],
	'phone': app.config['SUPPORT_PHONE']
}

settings['http'] = {
	'corsWhitelist': [ "192.168.*" ]
}

settings['network'] = {
	'MAC': '00:04:A6:72:9F:8E',
	'useDHCP': False,
	'ipAddress': '192.168.1.30',
	'subnetMask': '255.255.255.0',
	'gateway': '192.168.1.1',
	'primaryDNS': '8.8.4.4',
	'secondaryDNS': '8.8.8.8'
}

settings['time'] = {
	'current': '', # updated on init and reads
	'zone': settings['time'].get('zone', app.config['TIME_ZONE_OFFSET']),
	'useNTP': settings['time'].get('useNTP', app.config['TIME_USE_NTP']),
	'NTPServers': [], # from /etc/ntp.conf
	'NTPStatus': []
}

settings['snmp'] = {
	'mib': None
}
