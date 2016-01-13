# root level api access provides CME status

from . import config, settings, router, request, UriParse

from .auth import require_auth
from .util import json_response, json_error

from datetime import datetime, timezone
import subprocess

from .Channel import Channel

# hw status held in memcached object
import memcache, json

# Note you can use the memcache server on another machine
# if you allow access.  Comment the approppriate line in
# the /etc/memcached.conf on the other machine and restart
# the memcached service.

#mc = memcache.Client(['127.0.0.1:11211'], debug=0)
mc = memcache.Client(['10.16.120.174:11211'], debug=0)


# TODO: add some controls on the hw side and see if this works!
def set_control_state(ch_index, control_index, state):
	''' Updates a particular control state in the hw status
		object.  The control object must already exist in the
		status object hierarchy. '''
	hw = json.loads(mc.get('status'))
	hw['channels'][ch_index]['controls'][control_index].state = state
	mc.set('status', json.dumps(hw))


def status():
	''' top-level CME status object '''

	# try to read temperature (could fail if not on RPi)
	# temp in millidegrees C
	try:
		temp_C = int(open('/sys/class/thermal/thermal_zone0/temp').read()) / 1e3
	except:
		temp_C = -40.0 # Not on a RPi

	# Update the channels objects with the hardware data (from memcache).
	# I found that sometimes the mc.get('status') was returning None which
	# results in a 500 server error when json.loads().  To avoid that,
	# we check if cme_status is None and assign an object with empty
	# channels.
	cme_status = mc.get('status')	
	status = json.loads(cme_status) if cme_status else { 'channels': [] }

	return {
		'timestamp': datetime.utcnow().isoformat() + 'Z',
		'temperature_degC': temp_C,
		'channels': [Channel(ch) for ch in status['channels']]
	}


# CME status request
@router.route('/')
@router.route('/ch/')
@require_auth
def index():
	return json_response(status())


@router.route('/ch/raw')
@require_auth
def raw():
	''' Just the raw CME hwloop memcached status object '''
	return json_response(json.loads(mc.get('status')))


# CME channel update
@router.route('/ch/<int:ch_index>', methods=['GET', 'POST'])
@router.route('/ch/<int:ch_index>/name', methods=['GET', 'POST'])
@router.route('/ch/<int:ch_index>/description', methods=['GET', 'POST'])
@require_auth
def channel(ch_index):
	s = status()

	if not (ch_index >= 0 and ch_index < len(s['channels'])):
		return json_error('Channel not found', 404)

	# get the requested channel
	ch = s['channels'][ch_index]

	# parse out the item name (last element of request path)
	segments = UriParse.path_parse(request.path)
	item = segments[-1].lower()

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
@router.route('/ch/<int:ch_index>/controls/<int:c_index>/name', methods=['GET', 'POST'])
@router.route('/ch/<int:ch_index>/controls/<int:c_index>/state', methods=['GET', 'POST'])
@require_auth
def control(ch_index, c_index):
	s = status()

	if not (ch_index >= 0 and ch_index < len(s['channels'])):
		return json_error('Channel not found', 404)

	ch = s['channels'][ch_index]

	if not (c_index >= 0 and c_index < len(ch.controls)):
		return json_error('Control not found', 404)

	ctrl = ch.controls[c_index]

	# parse out the item name (last element of request path)
	segments = UriParse.path_parse(request.path)
	item = segments[-1].lower()

	# update name or description (or both) from POST data
	if request.method == 'POST':
		ctrl_update = request.get_json()
		if item == 'name':
			ctrl.name = ctrl_update.get('name', ctrl.name)
		elif item == 'state':
			ctrl.state = ctrl_update.get('state', ctrl.state)
			set_control_state(ch_index, c_index, ctrl.state)
		else:
			ctrl.name = ctrl_update.get('name', ctrl.name)
			ctrl.state = ctrl_update.get('state', ctrl.state)
			set_control_state(ch_index, c_index, ctrl.state)

	# figure out what to return
	if item == 'name':
		return json_response({ ch.id + ':' + ctrl.id: { 'name': ctrl.name }})
	elif item == 'state':
		return json_response({ ch.id + ':' + ctrl.id: { 'state': ctrl.state }})
	else:
		return json_response({ ch.id + ':' + ctrl.id: ctrl })
