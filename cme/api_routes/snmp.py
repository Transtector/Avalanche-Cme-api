# CME SNMPv3 configuration routes

from . import app, router, settings, send_from_directory

@router.route('/config/snmp')
def snmp():
	''' Returns the CME-MIB.txt file.

		No authorization required.  Client programs use this
		file to translate SNMP OID's into human readable strings.'''

	return send_from_directory(app.config['SNMPDIR'], 'CME-MIB.txt',
							   as_attachment=True)

