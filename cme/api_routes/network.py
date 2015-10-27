# CME network interface configuration routes

from . import router, settings, request

from .auth import require_auth
from .util import json_response, json_error


@router.route('/config/network', methods=['GET', 'POST'])
@require_auth
def network():
	if request.method == 'GET':
		return json_response(settings['network'])

	return json_error([ 'Not implemented' ])


