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

def get_request_param(key):
	''' Searches the request args (i.e., query string of the request URL)
		for parameters named by key.  Parameters can have a couple of
		different types of values: boolean or comma-separated integers.
		
		Here are a few examples of how the URL's might look and the
		value that should be returned from this function:

		http:<blah-blah>/api/ch/0?reset=true&expand=false
			get_request_param('reset') = True
			get_request_param('expand') = []

		http:<blah-blah>/api/ch/0?test=0,1,2&warning=true
			get_request_param('test') = [0,1,2]
			get_request_param('warning') = True

		http:<blah-blah>/api/ch/0?expand=0
			get_request_param('expand') = [0]
	'''
	value = request.args.get(key, None)

	if not value:
		return []

	if value.lower() == 'true':
		return True

	try:
		return [int(i) for i in value.split(',')]
	
	except:
		return []

def update_ch_pubs(channels):
	''' Reqests for all channels can provide query string parameters to
		set the publishing configuration for the channels.  So, for all
		available channels we convert "expand" and "reset" (or other)
		into channel publishing configuration and write them to the
		memcache.
		channels is a list of channel id's for which to update
		publishing configuration.
	'''
	for ch in channels:
		# channel publishing configs are stored 
		# in memcache by 'chX_pub' naming convention
		ch_pub_key = ch + "_pub"

		# get the current ch_pub if any
		ch_pub = json.loads(mc.get(ch_pub_key) or '{}')
		
		# strip channel index to filter query parameters
		# if they're provided as comma-separated list
		# of indices (e.g., 'reset=0,1,2')
		index = int(ch[2:])

		# Add or remove the config parameters from ch_pub
		# as determined by the query request parameters.
		# See get_request_param() above.
		for k, v in [(p, get_request_param(p))for p in ['reset', 'expand']]:

			if v == True or index in v:
				ch_pub[k] = True
			else:
				try:
					del ch_pub[k]
				except:
					pass
		
		# send the publish config for the channel to memcache
		# if we've filled it, otherwise remove it
		if ch_pub:
			mc.set(ch_pub_key, json.dumps(ch_pub))
		else:
			mc.delete(ch_pub_key)


def status(ch_index=-1):
	''' Top-level CME status object

		Returns a single channel identified with integer ch_index
		from the channels in the memcache status['channels'] list
		or all channels if ch_index < 0 (the default).
	'''	

	# get list of available channels
	channels = json.loads(mc.get('channels') or '[]') # [ 'ch0', ..., 'chN' ]

	# select all channels (ch_index < 0)
	if ch_index < 0:

		update_ch_pubs(channels) # update all channels' pub config

		return { 'channels': [ Channel(json.loads(mc.get(ch))) for ch in channels ] }

	# select specific channel 'chX'
	ch_id = 'ch' + str(ch_index)
	if not ch_id in channels:
		return None

	update_ch_pubs([ ch_id ]) # just update this channel's pub config

	return Channel(json.loads(mc.get(ch_id)))


# CME channels request
@router.route('/ch/')
@require_auth
def channels():
	return json_response(status(-1))


@router.route('/channels')
@require_auth
def channels_list():
	return json_response({ 'channels': json.loads(mc.get('channels') or '[]') })


# CME channel update
@router.route('/ch/<int:ch_index>', methods=['GET', 'POST'])
@router.route('/ch/<int:ch_index>/name', methods=['GET', 'POST'])
@router.route('/ch/<int:ch_index>/description', methods=['GET', 'POST'])
@router.route('/ch/<int:ch_index>/error')
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
	elif item == 'error':
		return json_response({ ch.id: { 'error': ch.error }})
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
