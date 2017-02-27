# CME sensor/control channels API

from datetime import datetime, timezone
import subprocess, json

from . import settings, router, request, path_parse, json_response, APIError, require_auth, Config

from ..common.Switch import switch
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

# CME list of available channels
@router.route('/channels/')
@require_auth
def channels_list():
	return json_response({ 'channels': ch_mgr.channels })


# CME channels request - actual channel objects returned
@router.route('/ch/')
@require_auth
def channels():
	return json_response(status(-1))



# CME channel updates
# DELETE a channel will clear its RRD database history
# GET a complete channel or bits of it (name, description, error, controls, or sensors)
# POST updates to the name or description (or both at the same time)
# Supply an optional query string 'h=[RESOLUTION]' to GET  channel history (RRD) data
@router.route('/ch/<int:ch_index>', methods=['GET', 'POST', 'DELETE'])
@router.route('/ch/<int:ch_index>/name', methods=['GET', 'POST'])
@router.route('/ch/<int:ch_index>/description', methods=['GET', 'POST'])
@router.route('/ch/<int:ch_index>/recordAlarms', methods=['GET', 'POST'])
@router.route('/ch/<int:ch_index>/error')
@require_auth
def channel(ch_index):

	ch = status(ch_index)

	if not ch:
		raise APIError('Channel not found', 404)

	# parse out the item name (last element of request path)
	segments = path_parse(request.path)
	item = segments[-1].lower()

	isFullChannel = item not in ['name', 'description', 'error', 'recordAlarms']

	for method in switch(request.method):
		if method('DELETE'): 
			# clear any history in ch buffer
			ch.clear_history()

			# clear the channel's historic data
			ch_mgr.clear_channel(ch.id)

			return json_response({ ch.id: ch })

		if method('POST'):
			# update name or description (or both) from POST data
			ch_update = request.get_json()
			ch.name = ch_update.get('name', ch.name)
			ch.description = ch_update.get('description', ch.description)
			ch.recordAlarms = ch_update.get('recordAlarms', ch.recordAlarms)
			break
	
		if method():
			# default GET request - see if we need to read ch history
			# check query string for h(istory) = RESOLUTION 
			h = request.args.get('h')
			h = h.lower() if h else None

			for case in switch(h):
				if case('live', 'daily', 'weekly', 'monthly', 'yearly'):
					ch.load_history(h)
					break

				if case():
					# default (no or unknown 'h' param - clear ch.data)
					# this case runs when no plot is needed
					ch.clear_history()
					pass

	if isFullChannel:
		return json_response({ ch.id: ch })

	return json_response({ ch.id: { item: ch.__dict__[item] }})


# CME channel configuration (hardware)
# Returns 404 (resource not found) if not RECOVERY MODE 
# (i.e., running at base OS, not within a Docker container).
# Generally config is READ-ONLY unless CALIBRATION_CODE is
# supplied in the query string with POSTED channel config data.
@router.route('/ch/<int:ch_index>/config', methods=['GET', 'POST'])
@require_auth
def ch_config(ch_index):

	if not Config.RECOVERY:
		raise APIError('Not Found', 404)

	# retrieve the desired channel configuration
	ch = ch_mgr.get_channel('ch' + str(ch_index))

	if not ch:
		raise APIError('Channel not found', 404)

	# pull the _config item from the channel and each of its sensors
	response = ch.get_hw_config()

	return json_response(response)



# CME channel sensors request
@router.route('/ch/<int:ch_index>/sensors/')
@require_auth
def sensors(ch_index):
	ch = status(ch_index)

	if not ch:
		raise APIError('Channel not found', 404)

	return json_response({ ch.id + ':sensors': sorted(ch.sensors, key=lambda s: s.id) })



# GET/POST sensors on specified channel individually
@router.route('/ch/<int:ch_index>/sensors/<int:s_index>')
@router.route('/ch/<int:ch_index>/sensors/<int:s_index>/name', methods=['GET', 'POST'])
@require_auth
def sensor(ch_index, s_index):
	ch = status(ch_index)

	if not ch:
		raise APIError('Channel not found', 404)

	if not (s_index >= 0 and s_index < len(ch.sensors)):
		raise APIError('Sensor not found', 404)

	sensor = sorted(ch.sensors, key=lambda s: s.id)[s_index]

	# parse out the item (last key in request)
	# it will be either the sensor index or a sensor attribute name
	segments = path_parse(request.path)
	item = segments[-1].lower()

	isFullSensor = item not in ['name']

	if isFullSensor:
		return json_response({ ch.id + ':' + sensor.id : sensor })

	# update from POST data (item will only match POST method names)
	if request.method == 'POST':
		update = request.get_json()
		sensor.__dict__[item] = update.get(item, sensor.__dict__[item])

	# return item attribute
	return json_response({ ch.id + ':' + sensor.id: { item: sensor.__dict__[item] }})


# CME sensor thresholds request
# GET - list current thresholds
# DELETE - remove all thresholds
# POST - add a new threshold: { value, direction, classification }
@router.route('/ch/<int:ch_index>/sensors/<int:s_index>/thresholds/', methods=['GET', 'POST', 'DELETE'])
@require_auth
def thresholds(ch_index, s_index):
	ch = status(ch_index)

	if not ch:
		raise APIError('Channel not found', 404)

	if not (s_index >= 0 and s_index < len(ch.sensors)):
		raise APIError('Sensor not found', 404)

	s = sorted(ch.sensors, key=lambda s: s.id)[s_index]

	if request.method == 'GET':
		return json_response({ ch.id + ':' + s.id + ':thresholds': s.thresholds })

	if request.method == 'DELETE':
		s.removeAllThresholds()
		return json_response({ ch.id + ':' + s.id + ':thresholds': s.thresholds })

	# else POST - add new threshold
	#try:
	th = s.addThreshold(request.get_json())
	return json_response(th, 201)
	#except:
	#	raise APIError('Bad request', 400)



# GET/POST thresholds on specified channel/sensor individually
@router.route('/ch/<int:ch_index>/sensors/<int:s_index>/thresholds/<th_id>', methods=['GET', 'POST', 'DELETE'])
@require_auth
def threshold(ch_index, s_index, th_id):
	ch = status(ch_index)

	if not ch:
		raise APIError('Channel not found', 404)

	if not (s_index >= 0 and s_index < len(ch.sensors)):
		raise APIError('Sensor not found', 404)

	s = sorted(ch.sensors, key=lambda s: s.id)[s_index]

	th = next((th for th in s.thresholds if th.id == th_id), None)

	if not th:
		raise APIError('Threshold not found', 404)

	for case in switch(request.method):
		if case('POST'):
			s.modifyThreshold(th, request.get_json())
			return json_response({ ch.id + ':' + s.id + ':' + th.id: th })

		if case('DELETE'): 
			# DELETE the identified threshold
			s.removeThreshold(th)
			return json_response(th)

		if case():
			# GET is default
			return json_response({ ch.id + ':' + s.id + ':' + th.id: th })

