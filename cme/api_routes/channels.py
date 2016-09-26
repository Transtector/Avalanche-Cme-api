# CME sensor/control channels API

from datetime import datetime, timezone
import subprocess, json

from . import settings, router, request, path_parse, json_response, json_error, require_auth
from ..util.Switch import switch
from .Models import ChannelManager


ch_mgr = ChannelManager()


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


def status(ch_index=-1):
	''' Top-level CME status object

		Returns a single channel identified with integer ch_index
		or all channels if ch_index < 0 (the default).
	'''	

	# get list of available channels
	channels = ch_mgr.channels # [ 'ch0', ..., 'chN' ]

	# select all channels (ch_index < 0)
	if ch_index < 0:
		return { 'channels': [ ch_mgr.get_channel(ch) for ch in channels ] }

	# select specific channel 'chX'
	return ch_mgr.get_channel('ch' + str(ch_index))


# CME channels request
@router.route('/ch/')
@require_auth
def channels():
	return json_response(status(-1))


@router.route('/channels/')
@require_auth
def channels_list():
	return json_response({ 'channels': ch_mgr.channels })


# CME channel updates
# DELETE a channel will clear its RRD database history
# GET a complete channel or bits of it (name, description, error, controls, or sensors)
# POST updates to the name or description (or both at the same time)
# Supply an optional query string 'h=[RESOLUTION]' to GET  channel history (RRD) data
@router.route('/ch/<int:ch_index>', methods=['GET', 'POST', 'DELETE'])
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
	segments = path_parse(request.path)
	item = segments[-1].lower()

	if request.method == 'DELETE':

		# clear any history in ch buffer
		ch.clear_history()

		# clear the channel's historic data
		ch_mgr.clear_channel(ch.id)

		return json_response({ ch.id: ch })


	if request.method == 'POST':
		# update name or description (or both) from POST data
		
		ch_update = request.get_json()

		if item == 'name':
			ch.name = ch_update.get('name', ch.name)
		elif item == 'description':
			ch.description = ch_update.get('description', ch.description)
		else:
			ch.name = ch_update.get('name', ch.name)
			ch.description = ch_update.get('description', ch.description)
	
	else:
		# GET request - see if we need to read ch history
		# check query string for h(istory) = RESOLUTION 
		h = request.args.get('h')
		h = h.lower() if h else None
		for case in switch(h):
			if case('realtime'): pass
			if case('daily'): pass
			if case('weekly'): pass
			if case('monthly'): pass
			if case('yearly'):
				ch.load_history(h)
				break

			if case():
				# no h or unknown - clear ch.data
				ch.clear_history()
				pass


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

# GET (download) history database dump for the indicated channel
@router.route('/ch/<int:ch_index>/data')
@require_auth
def channelDump(ch_index):
	return json_response({ 'channels': ch_mgr.channels })


# GET/POST sensors or controls on specified channel individually
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
	segments = path_parse(request.path)
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
