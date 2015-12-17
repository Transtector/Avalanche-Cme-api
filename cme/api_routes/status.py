# root level api access provides CME status

from . import router, request, UriParse

from .auth import require_auth
from .util import json_response, json_error

from datetime import datetime, timezone
import subprocess

CHANNELS = []
from .Channel import Channel

def status():
	''' top-level CME status object '''

	obj = {}
	obj['timestamp'] = datetime.utcnow().isoformat() + 'Z'

	# try to read temperature (could fail if not on RPi)
	# temp in millidegrees C
	temp = subprocess.getoutput("cat /sys/class/thermal/thermal_zone0/temp")

	try:
		obj['temperature_degC'] = round(int(temp) / 1000, 1)
	except:
		obj['temperature_degC'] = -40.0 # None


	# create and add channels if not there yet
	if (len(CHANNELS) == 0):
		for i in range(1):
			CHANNELS.append(Channel(i))

	# else just update the channels' sensors and controls
	else:
		for ch in CHANNELS:
			ch.update()

	obj['channels'] = CHANNELS

	return obj


# CME status request
@router.route('/')
@router.route('/ch/')
@require_auth
def index():
	return json_response(status())


# CME channel update
@router.route('/ch/<int:ch_index>', methods=['GET', 'POST'])
@router.route('/ch/<int:ch_index>/name', methods=['GET', 'POST'])
@router.route('/ch/<int:ch_index>/description', methods=['GET', 'POST'])
@require_auth
def channel(ch_index):
	s = status()

	if not (ch_index >= 0 and ch_index < len(s['channels'])):
		return json_error('Channel not found', 404)

	# parse out the item name (last element of request path)
	segments = UriParse.path_parse(request.path)
	item = segments[-1].lower()

	# get the requested channel
	ch = s['channels'][ch_index]

	# update name or description (or both) from POST data
	if request.method == 'POST':
		ch_update = request.get_json()
		if item == 'name':
			ch.name = ch_update.get('name', ch.name)
		elif item == 'description':
			ch.description = ch_update.get('description', ch.description)
		else:
			ch.name = ch_update.get('name', ch.name)
			ch.description = ch_update.get('description', ch.description)

	# figure out what to return
	if item == 'name':
		return json_response({ ch.id: { 'name': ch.name }})
	elif item == 'description':
		return json_response({ ch.id: { 'description': ch.description }})
	else:
		return json_response({ ch.id: ch })


@router.route('/ch/<int:ch_index>/controls/')
@router.route('/ch/<int:ch_index>/sensors/')
@require_auth
def sensors_and_controls(ch_index):
	s = status()
	
	if not (ch_index >= 0 and ch_index < len(s['channels'])):
		return json_error('Channel not found', 404)

	# parse out the item name (last element of request path)
	segments = UriParse.path_parse(request.path)
	item = segments[-1].lower()
	
	ch = s['channels'][ch_index]

	if item == 'controls':
		obj = { ch.id + ':controls': ch.controls }
	else:
		obj = { ch.id + ':sensors': ch.sensors }

	return json_response(obj)


@router.route('/ch/<int:ch_index>/sensors/<int:s_index>')
@require_auth
def sensor(ch_index, s_index):
	s = status()

	if not (ch_index >= 0 and ch_index < len(s['channels'])):
		return json_error('Channel not found', 404)

	ch = s['channels'][ch_index]

	if not (s_index >= 0 and s_index < len(ch.sensors)):
		return json_error('Sensor not found', 404)

	sen = ch.sensors[s_index]

	return json_response({ ch.id + ':' + sen.id: sen })


@router.route('/ch/<int:ch_index>/controls/<int:c_index>', methods=['GET', 'POST'])
@require_auth
def control(ch_index, c_index):
	s = status()

	if not (ch_index >= 0 and ch_index < len(s['channels'])):
		return json_error('Channel not found', 404)

	ch = s['channels'][ch_index]

	if not (c_index >= 0 and c_index < len(ch.controls)):
		return json_error('Control not found', 404)

	ctrl = ch.controls[c_index]

	if request.method == 'POST':
		ctrl.set(request.get_json()['state'])

	return json_response({ ch.id + ':' + ctrl.id: ctrl })
