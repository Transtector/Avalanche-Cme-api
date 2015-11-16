# CME http (web server) configuration handlers

from . import router, settings, request

from .auth import require_auth
from .util import json_response, json_error

@router.route('/config/http/', methods=['GET', 'POST'])
@require_auth
def http():
	if request.method == 'POST':
		return json_error([ 'Not implemented' ])

	return json_response(settings['http'])

