# CME alarms API (not channnel-specific; otherwise, see channels.py)

from datetime import datetime, timezone
import subprocess, json

from . import router, request, path_parse, json_response, APIError, require_auth, Config

from .Models import AlarmManager

# Retrieve alarms for system processed by query string arguments
@router.route('/alarms/', methods=['GET', 'DELETE'])
@require_auth
def alarms():

	c = request.args.get('c')

	if c and c != '*':
		c = c.split(',')

	s = request.args.get('s')
	try:
		s = int(s) if s else None
	except:
		s = 1

	e = request.args.get('e')
	try:
		e = int(e) if e else None
	except:
		e = 0

	alarm_mgr = AlarmManager()

	if request.method == 'DELETE':
		alarm_mgr.clear_alarms(c, s, e)
		return json_response(None)

	return json_response(alarm_mgr.load_alarms(c, s, e))


@router.route('/alarms/fake', methods=['GET'])
@require_auth
def fake_alarms():

	alarm_mgr = AlarmManager()
	alarm_mgr._clear_fake_alarms()
	alarm_mgr._insert_fake_alarms()

	return json_response("Fake alarms generated!")


