# CME temperature configuration routes

from . import router, settings, request, UriParse

from .auth import require_auth
from .util import json_response, json_error
from ..util.ClockUtils import refresh_time, manage_clock

@router.route('/config/temperature/', methods=['GET', 'POST'])
@require_auth
def temperature_config():
	if request.method == 'POST':
		newtemp = request.get_json()['temperature']

		curtemp = settings['temperature']

		curtemp['displayUnits'] = newtemp['displayUnits']

		settings['temperature'] = curtemp

	return json_response({'temperature': settings['temperature']})


@router.route('/config/temperature/displayUnits', methods=['GET', 'POST'])
@router.route('/config/temperature/warningTemp', methods=['GET', 'POST'])
@router.route('/config/temperature/alarmTemp', methods=['GET', 'POST'])
@require_auth
def temp_displayUnits_config():
	# parse out the setting item (last element of request path)
	item = UriParse.path_parse(request.path)[-1]
	
	if request.method == 'POST':
		newunits = request.get_json()[item]

		temp_config = settings['temperature']
		temp_config[item] = newunits
		settings['temperature'] = temp_config

	return json_response({ item: settings['temperature'][item] })
