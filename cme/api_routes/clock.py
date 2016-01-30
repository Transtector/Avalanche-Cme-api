# CME clock configuration routes
import os

from . import router, settings, request, UriParse

from .auth import require_auth
from .util import json_response, json_error
from .status import timestamp
from ..util.ClockUtils import refresh_time, manage_clock

def set_clock(newtime):
	# use the system 'date' command to set it
	# "%Y-%m-%dT%H:%M:%S.SSSSSS"
	# TODO: parse/validate the format
	os.system('sudo date -s "{0}"'.format(newtime))


@router.route('/config/clock/', methods=['GET', 'POST'])
@require_auth
def clock_config():
	if request.method == 'POST':
		newclock = request.get_json()['clock']

		curclock = settings['clock']

		curclock['zone'] = newclock['zone']
		curclock['ntp'] = newclock['ntp']
		curclock['servers'] = newclock['servers']
		curclock['displayRelativeTo'] = newclock['displayRelativeTo']
		curclock['display12HourTime'] = newclock['display12HourTime']
		curclock['displayDateFormat'] = newclock['displayDateFormat']
		curclock['displayTimeFormat24Hour'] = newclock['displayTimeFormat24Hour']
		curclock['displayTimeFormat12Hour'] = newclock['displayTimeFormat12Hour']

		settings['clock'] = curclock

		# if they've also sent a 'current' key, set the
		# clock to that value (but don't save it in settings)
		try:
			set_clock(newclock['current'])
		except:
			pass
		manage_clock(settings['clock'])

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
	item = UriParse.path_parse(request.path)[-1]

	if request.method == 'POST':
		clock = settings['clock']
		clock[item] = request.get_json()[item]
		settings['clock'] = clock
		
		manage_clock(settings['clock'])

	return json_response({ item: settings['clock'][item] })
