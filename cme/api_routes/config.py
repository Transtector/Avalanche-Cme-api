# CME configuration API route handlers

from . import router, request, settings

from .auth import require_auth
from .util import json_response, json_error, json_filter
from ..util.FileUtils import refresh_device, delay_factory_reset
from ..util.ClockUtils import refresh_time

import threading

# top-level configuration
@router.route('/config/', methods=['GET', 'POST'])
@require_auth
def config():
	if request.method == 'POST':
		return json_error([ 'Not implemented' ])

	refresh_device()
	refresh_time(settings['clock'])

	return json_response({ 'config': json_filter(settings.items()) })


@router.route('/config/factoryReset')
@require_auth
def factoryReset():
	
	# Factory reset deletes the settings.json file and performs a 
	# reboot.
	t = threading.Thread(target=delay_factory_reset, args=(5,))
	t.setDaemon(True)
	t.start()

	# Return nothing (but status = 200) to let 'em know we're resetting
	return json_response(None)
