# CME sensor/control channels API

from . import settings, router, request, UriParse

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


def get_expanded_channel_list():
	expand = request.args.get('expand', None)

	if not expand:
		return []

	if expand.lower() == 'true':
		return True

	try:
		return [int(i) for i in expand.split(',')]
	
	except:
		return []


def expand_this_channel(expand_channels_arg, ch_index):
	if not expand_channels_arg:
		return False

	if isinstance(expand_channels_arg, list):
		return ch_index in expand_channels_arg

	return expand_channels_arg


def status(ch_index=-1, expand_channels=False):
	''' Top-level CME status object

		ch_index - Returns a single channel object identified with integer index.
			If ch_index is included in expand_channels, then the channel data
			will be pulled from log file rather than live data. 
		
		expand_channels - a list of channel indices for which data should be pulled
			from log file rather than the live hardware.  Set True to expand all
			requested channels' data.
	'''

	# Update the channels objects with the hardware data (from memcache).
	# I found that sometimes the mc.get('status') was returning None which
	# results in a 500 server error when json.loads().  To avoid that,
	# we check if cme_status is None and assign an object with empty
	# channels.
	cme_status = mc.get('status')	
	status = json.loads(cme_status) if cme_status else { 'channels': [] }

	# Select a particular channel or all channels
	if not ch_index < 0:
		if not (ch_index >= 0 and ch_index < len(status['channels'])):
			return None

		return Channel(status['channels'][ch_index], expand_this_channel(expand_channels, ch_index))

	channels = [Channel(ch, expand_this_channel(expand_channels, i)) for i, ch in enumerate(status['channels'])]

	# Try to read temperature (could fail if not on RPi)
	# temp in millidegrees C
	try:
		temp_C = int(open('/sys/class/thermal/thermal_zone0/temp').read()) / 1e3
	except:
		temp_C = -40.0 # Not on a RPi

	return { 'channels': channels }


# CME channels request
@router.route('/ch/')
@require_auth
def channels():
	return json_response(status(-1, get_expanded_channel_list()))


@router.route('/ch/raw')
@require_auth
def raw():
	''' Just the raw CME hwloop memcached status object '''
	return "RAW: test is {0}".format(msg) #json_response(json.loads(mc.get('status')))


# CME channel update
@router.route('/ch/<int:ch_index>', methods=['GET', 'POST'])
@router.route('/ch/<int:ch_index>/name', methods=['GET', 'POST'])
@router.route('/ch/<int:ch_index>/description', methods=['GET', 'POST'])
@router.route('/ch/<int:ch_index>/controls/')
@router.route('/ch/<int:ch_index>/sensors/')
@require_auth
def channel(ch_index):

	ch = status(ch_index, get_expanded_channel_list())

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
@router.route('/ch/<int:ch_index>/sensors/<int:sc_index>/data')
@router.route('/ch/<int:ch_index>/controls/<int:sc_index>/data')
@require_auth
def sensor_control(ch_index, sc_index):
	ch = status(ch_index, get_expanded_channel_list())

	if not ch:
		return json_error('Channel not found', 404)

	# parse out the item (name, state) and the item type (sensor or control)
	segments = UriParse.path_parse(request.path)
	item = segments[-1].lower()

	if item == 'name' or item == 'state' or item == 'data':
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
	elif item == 'data':
		return json_response({ ch.id + ':' + obj.id: { 'data': obj.data }})
	else:
		return json_response({ ch.id + ':' + obj.id: obj })
