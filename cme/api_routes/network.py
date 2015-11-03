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


@router.route('/config/network/MAC')
@require_auth
def mac():
	return json_response({'MAC': settings['network']['MAC']})


@router.route('/config/network/useDHCP', methods=['GET', 'POST'])
@require_auth
def useDHCP():
	if request.method == 'POST':
		return json_error([ 'Not implemented' ])

	return json_response(settings['network']['useDHCP'])
