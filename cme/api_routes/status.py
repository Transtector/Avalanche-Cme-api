# root level api access provides CME status

from . import router

from .auth import require_auth
from .util import json_response

from datetime import datetime

import random

# Units by sensor type
UNITS = {
	'AC_VOLTAGE': 'Vrms',
	'AC_CURRENT': 'Arms',
	'DC_VOLTAGE': 'V',
	'DC_CURRENT': 'A'
}


def sensor(timestamp, index, sensor_type):
	''' Sensor object '''
	obj = {}
	obj['id'] = 's' + str(index)
	obj['type'] = sensor_type
	obj['unit'] = UNITS[sensor_type]
	obj['timestamp'] = timestamp
	obj['points'] = 1

	if sensor_type == 'AC_VOLTAGE':
		val = random.randrange(118000, 122001)
		obj['value'] = val / 1000

	else:
		val = random.randrange(25, 51)
		obj['value'] = val / 10

	return obj


def control(timestamp, index, control_type):
	''' Control object '''
	obj = {}
	obj['id'] = 'c' + str(index)
	obj['type'] = control_type
	obj['timestamp'] = timestamp
	obj['open'] = True

	return obj


def scb(timestamp, index):
	''' Sensor Control Block '''
	obj = {}
	obj['id'] = 'scb' + str(index)
	obj['name'] = 'scb' + str(index)
	obj['description'] = 'sensor control block ' + str(index)
	obj['sensors'] = [
		sensor(timestamp, 0, 'AC_VOLTAGE'),
		sensor(timestamp, 1, 'AC_CURRENT')
	]
	obj['controls'] = [
		control(timestamp, 0, 'SPST_RELAY')
	]

	return obj

def status():
	''' top-level CME status object '''
	obj = {}
	timestamp = datetime.utcnow().isoformat() + 'Z'

	obj['timestamp'] = timestamp
	obj['scbs'] = [
		scb(timestamp, 0),
		scb(timestamp, 1)
	]

	return obj

# CME status request
@router.route('/')
@require_auth
def index():
	return json_response(status())
