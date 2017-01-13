# root level CME API

from datetime import datetime, timezone
from . import settings, router, json_response, APIError, require_auth

def timestamp():
	''' Raw function to get current CME date/time in UTC and ISO 8601 format.
	'''
	return datetime.utcnow().isoformat() + 'Z'


@router.route('/clock')
@require_auth
def clock():
	''' CME date/time requuest.
	'''
	return json_response({ 'clock': timestamp() })

@router.route('/temperature')
@require_auth
def temperature():
	''' Try to read temperature (could fail if not on RPi) millidegrees C.
	'''
	try:
		temp_C = int(open('/sys/class/thermal/thermal_zone0/temp').read()) / 1e3
	except:
		temp_C = -40.0 # Not on a RPi

	return json_response({ 'temperature': temp_C })


