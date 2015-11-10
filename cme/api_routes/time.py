# CME time configuration routes

from . import router, settings, request, UriParse

from .auth import require_auth
from .util import json_response, json_error
from ..util.TimeUtils import refresh_time, manage_time

@router.route('/config/time', methods=['GET', 'POST'])
@require_auth
def time():
	if request.method == 'POST':
		return json_error([ 'Not implemented' ])

	refresh_time(settings['time'])
	return json_response({'time': settings['time']})

@router.route('/config/time/current', methods=['GET', 'POST'])
@require_auth
def current():
	if request.method == 'POST':
		if settings['time']['ntp']:
			return json_error(['Time is read-only when using NTP'])

		newtime = request.get_json()['current']

		# use the system 'date' command to set it
		# "%Y-%m-%dT%H:%M:%S.SSSSSS"
		# TODO: parse/validate the format
		os.system('sudo date -s "{0}"'.format(newtime))

	refresh_time(settings['time'])
	return json_response({ 'current': settings['time']['current'] })

@router.route('/config/time/zone', methods=['GET', 'POST'])
@require_auth
def zone():
	if request.method == 'POST':

		# TODO: parse and validate the format
		# "%H:%M" with optional +/- sign
		settings_group = settings['time']
		settings_group['zone'] = request.get_json()['zone']
		settings['time'] = settings_group

	return json_response({ 'zone': settings['time']['zone'] })

@router.route('/config/time/ntp', methods=['GET', 'POST'])
@router.route('/config/time/servers', methods=['GET', 'POST'])
@require_auth
def ntp_update():
	# parse out the setting item (last element of request path)
	item = UriParse.path_parse(request.path)[-1]

	if request.method == 'POST':
		settings_group = settings['time']
		settings_group[item] = request.get_json()[item]
		settings['time'] = settings_group
		manage_time(settings['time'])

	return json_response({ item: settings['time'][item] })

@router.route('/config/time/status')
@require_auth
def ntp_status():
	refresh_time(settings['time'])
	return json_response({ 'status': settings['time']['status'] })

