# CME clock configuration routes

from . import router, settings, request, UriParse

from .auth import require_auth
from .util import json_response, json_error
from ..util.ClockUtils import refresh_time, manage_time

@router.route('/config/clock', methods=['GET', 'POST'])
@require_auth
def time():
	if request.method == 'POST':
		return json_error([ 'Not implemented' ])

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
		settings_group = settings['clock']
		settings_group[item] = request.get_json()[item]
		settings['clock'] = settings_group
		manage_time(settings['clock'])

	return json_response({ item: settings['clock'][item] })

@router.route('/config/clock/status')
@require_auth
def ntp_status():
	refresh_time(settings['clock'])
	return json_response({ 'status': settings['clock']['status'] })

