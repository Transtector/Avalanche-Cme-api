# CME device and configuration API route handlers

import os, threading

from . import (router, settings, request, json_response, 
	APIError, json_filter, require_auth, refresh_device)

from ..util.ClockUtils import refresh_time
from ..util.Reboot import reset


@router.route('/config/', methods=['GET'])
@require_auth
def config():
	# returns the top-level CME configuration

	refresh_device()
	refresh_time(settings['clock'])

	return json_response({ 'config': json_filter(settings.items()) })


@router.route('/config/reset', methods=['GET'])
@require_auth
def reset():

	reset_network = request.args.get('reset_network')
	reset_clock = request.args.get('reset_clock')
	
	# Factory reset deletes the settings.json file and performs a 
	# reboot.
	t = threading.Thread(target=reset, args=(5, reset_network, reset_clock, ))
	t.setDaemon(True)
	t.start()

	# Return nothing (but status = 200) to let 'em know we're resetting
	return json_response(None)

