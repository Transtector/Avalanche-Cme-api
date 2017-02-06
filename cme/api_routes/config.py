# CME device and configuration API route handlers

import os, threading

from . import (router, settings, request, json_response, 
	APIError, json_filter, require_auth)

from ..common.ClockUtils import refresh_time


@router.route('/config/', methods=['GET'])
@require_auth
def config():
	# returns the top-level CME configuration

	refresh_time(settings['clock'])

	return json_response({ 'config': json_filter(settings.items()) })
