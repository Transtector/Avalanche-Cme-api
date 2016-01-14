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


def status(ch_index=-1):
	''' Top-level CME status object
	'''

	# Update the channels objects with the hardware data (from memcache).
	# I found that sometimes the mc.get('status') was returning None which
	# results in a 500 server error when json.loads().  To avoid that,
	# we check if cme_status is None and assign an object with empty
	# channels.
	cme_status = mc.get('status')	
	status = json.loads(cme_status) if cme_status else { 'channels': [] }

	# select a particular channel
	if not ch_index < 0:
		if not (ch_index >= 0 and ch_index < len(status['channels'])):
			return None

		return Channel(status['channels'][ch_index])

	# If we reach here we return entire status object, including
	# the CPU temperature and timestamp.

	# try to read temperature (could fail if not on RPi)
	# temp in millidegrees C
	try:
		temp_C = int(open('/sys/class/thermal/thermal_zone0/temp').read()) / 1e3
	except:
		temp_C = -40.0 # Not on a RPi

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
@router.route('/ch/<int:ch_index>/controls/')
@router.route('/ch/<int:ch_index>/sensors/')
@require_auth
def channel(ch_index):
	ch = status(ch_index)

	if not ch:
		return json_error('Channel not found', 404)

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
	elif item == 'controls':
		return json_response({ ch.id + ':controls': ch.controls })
	elif item == 'sensors':
		return json_response({ ch.id + ':sensors': ch.sensors })
	else:
		return json_response({ ch.id: ch })


@router.route('/ch/<int:ch_index>/sensors/<int:sc_index>')
@router.route('/ch/<int:ch_index>/controls/<int:sc_index>', methods=['GET', 'POST'])
@router.route('/ch/<int:ch_index>/sensors/<int:sc_index>/name', methods=['GET', 'POST'])
@router.route('/ch/<int:ch_index>/controls/<int:sc_index>/name', methods=['GET', 'POST'])
@router.route('/ch/<int:ch_index>/controls/<int:sc_index>/state', methods=['GET', 'POST'])
@require_auth
def sensor_control(ch_index, sc_index):

	ch = status(ch_index)

	if not ch:
		return json_error('Channel not found', 404)

	# parse out the item (name, state) and the item type (sensor or control)
	segments = UriParse.path_parse(request.path)
	item = segments[-1].lower()

	if item == 'name' or item == 'state':
		typename = segments[-3].lower()
	else:
		typename = segments[-2].lower()

	# retrieve the object by type and index
	if typename == 'sensors':
		if not (sc_index >= 0 and sc_index < len(ch.sensors)):
			return json_error('Sensor not found', 404)

		obj = ch.sensors[sc_index]
	
	elif typename == 'controls':
		if not (sc_index >= 0 and sc_index < len(ch.controls)):
			return json_error('Control not found', 404)

		obj = ch.controls[sc_index]


	# update name or state (or both) from POST data
	if request.method == 'POST':
		update = request.get_json()

		if item == 'name':
			obj.name = update.get('name', obj.name)
		elif item == 'state':
			obj.state = update.get('state', obj.state)
			set_control_state(ch_index, sc_index, obj.state)
		else:
			obj.name = update.get('name', obj.name)
			if typename == 'control':
				obj.state = update.get('state', obj.state)
				set_control_state(ch_index, sc_index, obj.state)

	# figure out what to return
	if item == 'name':
		return json_response({ ch.id + ':' + obj.id: { 'name': obj.name }})
	elif item == 'state':
		return json_response({ ch.id + ':' + obj.id: { 'state': obj.state }})
	else:
		return json_response({ ch.id + ':' + obj.id: obj })
