# CME SNMPv3 configuration routes

from . import router, settings, request

from .auth import require_auth
from .util import json_response, json_error

@router.route('/config/snmp', methods=['GET', 'POST'])
@require_auth
def snmp():
	if request.method == 'GET':
		return json_response(settings['snmp'])

	return json_error([ 'Not implemented' ])

