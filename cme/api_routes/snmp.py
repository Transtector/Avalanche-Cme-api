# CME SNMPv3 configuration routes

from . import router, settings, send_from_directory, json_response, json_error, require_auth
from .. import Config

@router.route('/config/snmp/')
@require_auth
def snmp():
	return json_response({'snmp': settings['snmp']})

@router.route('/config/snmp/mib')
@require_auth
def snmp_mib():
	''' Returns the CME-MIB.txt file.

		No authorization required.  Client programs use this
		file to translate SNMP OID's into human readable strings.'''

	return send_from_directory(Config.SNMPDIR, 'CME-MIB.txt', as_attachment=True)


