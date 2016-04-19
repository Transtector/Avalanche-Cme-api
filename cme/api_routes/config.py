# CME configuration API route handlers
from . import router, request, settings

from .auth import require_auth
from .util import json_response, json_error, json_filter
from ..util.ClockUtils import refresh_time

import os, time, threading

# top-level configuration
@router.route('/config/', methods=['GET', 'POST'])
@require_auth
def config():
	if request.method == 'POST':
		return json_error([ 'Not implemented' ])

	refresh_device()
	refresh_time(settings['clock'])

	return json_response({ 'config': json_filter(settings.items()) })


@router.route('/config/factoryReset')
@require_auth
def factoryReset():
	
	# Factory reset deletes the settings.json file and performs a 
	# reboot.
	t = threading.Thread(target=factory_reset, args=(5,))
	t.setDaemon(True)
	t.start()

	# Return nothing (but status = 200) to let 'em know we're resetting
	return json_response(None)



# check for firmware update file presence
def refresh_device():
	''' Check uploads folder for any contents.  There should only
		be at most a single file which will be used if an update
		is triggered.'''

	files = [fn for fn in os.listdir(app.config['UPLOADS'])
			if any(fn.endswith(ext) for ext in app.config['ALLOWED_EXTENSIONS'])]

	# choose the first one, if any
	settings['__device']['__update'] = '' if len(files) == 0 else files[0]


# perform the factory reset 
def factory_reset(delay=5):

	try:
		os.remove(app.config['SETTINGS'])
	except:
		pass

	print("Factory reset and restart in {0} seconds...".format(delay))
	time.sleep(delay)

	if app.config['IS_CME']:
		os.system("reboot")
	


