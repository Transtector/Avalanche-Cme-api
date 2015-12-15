# root level api access provides CME status

from . import router

from .auth import require_auth
from .util import json_response

from datetime import datetime, timezone

import random

# Units by sensor type
UNITS = {
	'AC_VOLTAGE': 'Vrms',
	'AC_CURRENT': 'Arms',
	'DC_VOLTAGE': 'V',
	'DC_CURRENT': 'A'
}

CONTROLS = {}

SENSORS = {}

def sensor(index, sensor_type):
	''' Sensor object '''
	id = 's' + str(index)

	if sensor_type == 'AC_VOLTAGE':
		value = random.randrange(118000, 122001) / 1000

	else:
		value = random.randrange(25, 51) / 10

	obj = {}
	obj['id'] = id
	obj['type'] = sensor_type
	obj['unit'] = UNITS[sensor_type]

	ts = datetime.utcnow().replace(tzinfo=timezone.utc).timestamp()

	if not (id in SENSORS):
		SENSORS[id] = [[ ts - 259200, value ]]

	SENSORS[id].append([ ts, value ])

	obj['data'] = [
		SENSORS[id][0],
		SENSORS[id][-1]
	]
	
	return obj


def control(index, control_type):
	''' Control object '''
	id = 'c' + str(index)

	obj = {}
	obj['id'] = id
	obj['type'] = control_type

	ts = datetime.utcnow().replace(tzinfo=timezone.utc).timestamp()

	if not (id in CONTROLS):
		CONTROLS[id] = [[ ts - 259200, True ]]
		
	CONTROLS[id].append([ ts, True ])

	obj['data'] = [
		CONTROLS[id][0],
		CONTROLS[id][-1]
	]

	return obj


def channel(index):
	''' Channel - includes sensors and controls '''
	obj = {}
	obj['id'] = 'ch' + str(index)
	obj['name'] = 'ch' + str(index)
	obj['description'] = 'channel ' + str(index) + ' description'

	obj['sensors'] = [
		sensor(0, 'AC_VOLTAGE'),
		sensor(1, 'AC_CURRENT')
	]

	obj['controls'] = [
		control(0, 'SPST_RELAY')
	]

	return obj

def status():
	''' top-level CME status object '''
	obj = {}
	timestamp = datetime.utcnow().isoformat() + 'Z'

	obj['timestamp'] = timestamp
	obj['channels'] = [
		channel(0) #,
		#channel(1),
		#channel(2),
		#channel(3)
	]

	return obj

# CME status request
@router.route('/')
@require_auth
def index():
	return json_response(status())
