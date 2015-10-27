# CME time configuration routes

from . import router, settings, request

from .auth import require_auth
from .util import json_response, json_error, refresh_time

@router.route('/config/time', methods=['GET', 'POST'])
@require_auth
def time():
	if request.method == 'POST':
		return json_error([ 'Not implemented' ])

	refresh_time()
	return json_response(settings['time'])

@router.route('/config/time/current', methods=['GET', 'POST'])
@require_auth
def current():
	if request.method == 'POST':
		if settings['time']['useNTP']:
			return json_error(['Time is read-only when using NTP'])

		newtime = request.get_json()['current']

		# use the system 'date' command to set it
		# "%Y-%m-%dT%H:%M:%SZ"
		# TODO: parse/validate the format
		os.system('sudo date -s "{0}"'.format(newtime))

		refresh_time()
		return json_response({ 'current': settings['time']['current'] })

	refresh_time()
	return json_response({ 'current': settings['time']['current'] })

@router.route('/config/time/zone', methods=['GET', 'POST'])
@require_auth
def zone():
	if request.method == 'POST':

		# TODO: parse and validate the format
		# "%H:%M" with optional +/- sign
		settings['time']['zone'] = request.get_json()['zone']

	return json_response({ 'current': settings['time']['zone'] })

@router.route('/config/time/useNTP', methods=['GET', 'POST'])
@require_auth
def useNTP():
	if request.method == 'POST':

		useNTP = request.get_json()['useNTP']

		# need to start NTP up?
		if useNTP and not settings['time']['useNTP']:
			settings['time']['useNTP'] = True
			if app.config['RUNNING_ON_PI']:
				os.system('sudo service ntp start')

		# need to stop NTP?
		if not useNTP and settings['time']['useNTP']:
			settings['time']['useNTP'] = False
			if app.config['RUNNING_ON_PI']:
				os.system('sudo service ntp stop')

	return json_response({ 'useNTP': settings['time']['useNTP'] })

@router.route('/config/time/NTPServers', methods=['GET', 'POST'])
@require_auth
def ntp_servers():
	if request.method == 'POST':
		servers = request.get_json()['NTPServers']

		if servers != settings['time']['NTPServers']:
			# write new servers to /etc/ntp.conf
			write_ntp_servers(servers)

			# restart service, if useNTP
			if settings['time']['useNTP'] and app.config['RUNNING_ON_PI']:
				os.system('sudo service ntp restart')

			# refresh time (reads ntp.conf servers into settings)
			refresh_time()

	return json_response({ 'NTPServers': settings['time']['NTPServers'] })

@router.route('/config/time/NTPStatus')
@require_auth
def ntp_status():
	refresh_time()
	return json_response({ 'NTPStatus': settings['time']['NTPStatus'] })

