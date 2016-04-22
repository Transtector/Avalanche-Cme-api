# CME http (web server) configuration handlers

from . import router, settings, request
from .util import json_response, json_error
from ..util.Auth import require_auth


@router.route('/config/http/', methods=['GET', 'POST'])
@require_auth
def http():
	if request.method == 'POST':
		return json_error([ 'Not implemented' ])

	return json_response(settings['http'])

