# CME configuration API route handlers

from . import router, request, settings

from .auth import require_auth
from .util import json_response, json_error
from ..util.FileUtils import refresh_device
from ..util.TimeUtils import refresh_time


# top-level configuration
@router.route('/config', methods=['GET', 'POST'])
@require_auth
def config():
	if request.method == 'POST':
		return json_error([ 'Not implemented' ])

	refresh_device()
	refresh_time(settings['time'])

	# filter double underscore items
	filtered_settings = {k:v for (k,v) in settings.items() if not k.startswith('__')}

	return json_response({ 'config': filtered_settings })



