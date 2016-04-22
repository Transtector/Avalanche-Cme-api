# root level CME API

from datetime import datetime, timezone
from . import settings, router
from .util import json_response, json_error
from ..util.Auth import require_auth

def timestamp():
	return datetime.utcnow().isoformat() + 'Z'

# CME clock (datetime) request
@router.route('/clock')
@require_auth
def clock():
	return json_response({ 'clock': timestamp() })

# CME CPU temperature request
@router.route('/temperature')
@require_auth
def temperature():

	# Try to read temperature (could fail if not on RPi)
	# temp in millidegrees C
	try:
		temp_C = int(open('/sys/class/thermal/thermal_zone0/temp').read()) / 1e3
	except:
		temp_C = -40.0 # Not on a RPi

	return json_response({ 'temperature': temp_C })


