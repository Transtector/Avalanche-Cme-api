# CME network interface configuration routes

from . import router, settings, request

from .auth import require_auth
from .util import json_response, json_error


@router.route('/config/network', methods=['GET', 'POST'])
@require_auth
def network():
	if request.method == 'POST':
		return json_error([ 'Not implemented' ])

	return json_response(settings['network'])


@router.route('/config/network/mac')
@require_auth
def mac():
	return json_response({'mac': settings['network']['mac']})


@router.route('/config/network/dhcp', methods=['GET', 'POST'])
@require_auth
def useDHCP():
	if request.method == 'POST':
		return json_error([ 'Not implemented' ])

	return json_response({'dhcp': settings['network']['dhcp']})
