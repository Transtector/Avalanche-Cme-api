# CME SNMPv3 configuration routes

from . import app, router, settings, send_from_directory

from .auth import require_auth
from .util import json_response, json_error

@router.route('/config/snmp')
@require_auth
def snmp():
	return json_response({'snmp': { 'mib': None }})

@router.route('/config/snmp/mib')
@require_auth
def snmp_mib():
	''' Returns the CME-MIB.txt file.

		No authorization required.  Client programs use this
		file to translate SNMP OID's into human readable strings.'''

	return send_from_directory(app.config['SNMPDIR'], 'CME-MIB.txt',
							   as_attachment=True)



