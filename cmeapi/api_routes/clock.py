# CME clock configuration routes
import os

from . import router, settings, request, path_parse, json_response, APIError, require_auth, timestamp
from ..common.ClockUtils import refresh_time, manage_clock, set_clock


@router.route('/config/clock/', methods=['GET', 'POST'])
@require_auth
def clock_config():
	if request.method == 'POST':
		newclock = request.get_json()['clock']

		curclock = settings['clock']

		for k in curclock.keys():
			if not k == 'current':
				curclock[k] = newclock.get(k, curclock[k])

		settings['clock'] = curclock

		# if they've also sent a 'current' key, set the
		# clock to that value (but don't save it in settings)
		if newclock.get('current'):
			set_clock(newclock['current'])

		# update the clock with new settings
		manage_clock(settings)

	# refresh the current time w/new settings
	refresh_time(settings['clock'])
	return json_response({'clock': settings['clock']})
	

@router.route('/config/clock/current', methods=['POST'])
@require_auth
def current():
	newtime = request.get_json()['current']

	set_clock(newtime)

	return json_response({ 'current': timestamp() })



@router.route('/config/clock/status')
@require_auth
def ntp_status():
	refresh_time(settings['clock'])
	return json_response({ 'status': settings['clock']['status'] })


@router.route('/config/clock/zone', methods=['GET', 'POST'])
@router.route('/config/clock/ntp', methods=['GET', 'POST'])
@router.route('/config/clock/servers', methods=['GET', 'POST'])
@router.route('/config/clock/displayRelativeTo', methods=['GET', 'POST'])
@router.route('/config/clock/display12HourTime', methods=['GET', 'POST'])
@router.route('/config/clock/displayDateFormat', methods=['GET', 'POST'])
@router.route('/config/clock/displayTimeFormat24Hour', methods=['GET', 'POST'])
@router.route('/config/clock/displayTimeFormat12Hour', methods=['GET', 'POST'])
@require_auth
def clock_display():
	# parse out the setting item (last element of request path)
	item = path_parse(request.path)[-1]

	if request.method == 'POST':
		clock = settings['clock']
		clock[item] = request.get_json()[item]
		settings['clock'] = clock
		
		manage_clock(settings)

	return json_response({ item: settings['clock'][item] })
