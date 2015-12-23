# CME clock configuration routes

from . import router, settings, request, UriParse

from .auth import require_auth
from .util import json_response, json_error
from ..util.ClockUtils import refresh_time, manage_clock

@router.route('/config/clock', methods=['GET', 'POST'])
@require_auth
def clock():
	if request.method == 'POST':
		newclock = request.get_json()['clock']

		settings['clock']['zone'] = newclock['zone']
		settings['clock']['ntp'] = newclock['ntp']
		settings['clock']['servers'] = newclock['servers']
		settings['clock']['displayRelativeTo'] = newclock['displayRelativeTo']
		settings['clock']['display12HourTime'] = newclock['display12HourTime']
		settings['clock']['displayDateFormat'] = newclock['displayDateFormat']
		settings['clock']['displayTimeFormat24Hour'] = newclock['displayTimeFormat24Hour']
		settings['clock']['displayTimeFormat12Hour'] = newclock['displayTimeFormat12Hour']

		manage_clock(settings['clock'])

	refresh_time(settings['clock'])
	return json_response({'clock': settings['clock']})

@router.route('/config/clock/current', methods=['GET', 'POST'])
@require_auth
def current():
	if request.method == 'POST':
		if settings['clock']['ntp']:
			return json_error(['Time is read-only when using NTP'])

		newtime = request.get_json()['current']

		# use the system 'date' command to set it
		# "%Y-%m-%dT%H:%M:%S.SSSSSS"
		# TODO: parse/validate the format
		os.system('sudo date -s "{0}"'.format(newtime))

	refresh_time(settings['clock'])
	return json_response({ 'current': settings['clock']['current'] })

@router.route('/config/clock/zone', methods=['GET', 'POST'])
@require_auth
def zone():
	if request.method == 'POST':

		settings_group = settings['clock']
		settings_group['zone'] = request.get_json()['zone']
		settings['clock'] = settings_group

	return json_response({ 'zone': settings['clock']['zone'] })

@router.route('/config/clock/ntp', methods=['GET', 'POST'])
@router.route('/config/clock/servers', methods=['GET', 'POST'])
@require_auth
def ntp_update():
	# parse out the setting item (last element of request path)
	item = UriParse.path_parse(request.path)[-1]

	if request.method == 'POST':
		settings['clock'][item] = request.get_json()[item]
		manage_clock(settings['clock'])

	return json_response({ item: settings['clock'][item] })

@router.route('/config/clock/status')
@require_auth
def ntp_status():
	refresh_time(settings['clock'])
	return json_response({ 'status': settings['clock']['status'] })

@router.route('/config/clock/displayRelativeTo', methods=['GET', 'POST'])
@router.route('/config/clock/display12HourTime', methods=['GET', 'POST'])
@router.route('/config/clock/displayDateFormat', methods=['GET', 'POST'])
@router.route('/config/clock/displayTimeFormat24Hour', methods=['GET', 'POST'])
@router.route('/config/clock/displayTimeFormat12Hour', methods=['GET', 'POST'])
@require_auth
def clock_display():
	# parse out the setting item (last element of request path)
	item = UriParse.path_parse(request.path)[-1]

	if request.method == 'POST':
		settings['clock'][item] = request.get_json()[item]

	return json_response({ item: settings['clock'][item] })
