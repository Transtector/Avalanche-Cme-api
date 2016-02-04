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

def channel_parameter_to_list(param=None):
	param = request.args.get(param, None)

	if not param:
		return []

	if param.lower() == 'true':
		return True

	try:
		return [int(i) for i in param.split(',')]
	
	except:
		return []

def update_config(config, key, value):
	try:
		config[key].update(value)
	except:
		config[key] = value

def channels_config(ch_index=-1, number_of_channels=0):
	config = {}

	list_of_channels_to_reset = channel_parameter_to_list('reset') # e.g., [ 0, 1, ... ] or True/False
	list_of_channels_to_expand = channel_parameter_to_list('expand') # e.g., [ 0, 1, ... ] or True/False
	
	# expand or reset requested?  if not, just return empty
	if not (list_of_channels_to_expand or list_of_channels_to_reset):
		return config

	# dealing with an individual channel?
	if not ch_index < 0:
		if list_of_channels_to_reset == True or ch_index in list_of_channels_to_reset:
			update_config(config, 'ch' + str(ch_index), { 'reset': True })
		if list_of_channels_to_expand == True or ch_index in list_of_channels_to_expand:
			update_config(config, 'ch' + str(ch_index), { 'expand': True })
	
	# else dealing with "all" channels
	else:

		# reset all channels (i.e., request had "reset=true")
		if type(list_of_channels_to_reset) is bool and list_of_channels_to_reset and number_of_channels > 0:
			for i in range(number_of_channels):
				update_config(config, 'ch' + str(i), { 'reset': True })
		
		# reset specific channels (i.e., request had "reset=0,1,2")
		elif list_of_channels_to_reset:
			for i in list_of_channels_to_reset:
				update_config(config, 'ch' + str(i), { 'reset': True })

		if type(list_of_channels_to_expand) is bool and list_of_channels_to_expand and number_of_channels > 0:
			for i in range(number_of_channels):
				update_config(config, 'ch' + str(i), { 'expand': True })

		elif list_of_channels_to_expand:
			for i in list_of_channels_to_expand:
				update_config(config, 'ch' + str(i), { 'expand': True })

	return config

def status(ch_index=-1):
	''' Top-level CME status object

		Returns a single channel identified with integer ch_index
		from the channels in the memcache status['channels'] list
		or all channels if ch_index < 0 (the default).
	'''
	# Update the channels objects with the hardware data (from memcache).
	# I found that sometimes the mc.get('status') was returning None which
	# results in a 500 server error when json.loads().  To avoid that,
	# we check if cme_status is None and assign an object with empty
	# channels.
	status = mc.get('status')	
	status = json.loads(status) if status else { 'channels': [] }

	# Update the channels_config every time we read status
	ch_config = channels_config(ch_index, len(status['channels']))
	if ch_config:
		mc.set('channels_config', json.dumps(ch_config))
	else:
		mc.delete('channels_config')

	# Select a particular channel or all channels
	if not ch_index < 0:
		if not (ch_index >= 0 and ch_index < len(status['channels'])):
			return None

		return Channel(status['channels'][ch_index])

	return { 'channels': [Channel(ch) for ch in status['channels']] }


# CME channels request
@router.route('/ch/')
@require_auth
def channels():
	return json_response(status(-1))


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
@router.route('/ch/<int:ch_index>/sensors/<int:sc_index>/data')
@router.route('/ch/<int:ch_index>/controls/<int:sc_index>/data')
@require_auth
def sensor_control(ch_index, sc_index):
	ch = status(ch_index)

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
