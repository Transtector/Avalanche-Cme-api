# CME device and configuration API route handlers
from . import app, router, settings, request, UriParse, secure_filename

from .auth import require_auth
from .util import json_response, json_error, json_filter
from ..util.ClockUtils import refresh_time

import os, time, threading

# Read-only device settings - NOT password protected
# These are saved in settings, but under the "__device" key
@router.route('/device/')
@router.route('/device/modelNumber')
@router.route('/device/serialNumber')
@router.route('/device/firmware')
def device_read_only_settings():
	# parse out the setting name (last element of request path)
	segments = UriParse.path_parse(request.path)
	item = segments[-1]

	# device requests need to check for update files
	refresh_device()

	if item == 'device':
		return json_response({ 'device': json_filter(settings['__device'].items()) })
	else:
		return json_response({ item: settings['__device'][item] })


# update firmware (POST file or path to /config/device/update)
@router.route('/device/update', methods=['GET', 'POST'])
@require_auth
def device_update():
	filename = settings['__device']['__update']

	if request.method == 'POST':
		# handle upload new firmware
		file = request.files['file']

		if file and __allowed_file(file.filename):
			filename = secure_filename(file.filename)

			path = path.join(app.config['UPLOADS'], filename)
			print("saving uploads to {", p, "}")

			file.save(p)

	refresh_device()

	return json_response({ 'update': filename })


# trigger a firmware update
@router.route('/device/updateTrigger', methods=['POST'])
@require_auth
def device_trigger_update():
	return json_error([ 'Not implemented' ])


# DEBUGGING
# Use this method to debug file uploads
@router.route('/device/up', methods=['GET', 'POST'])
@require_auth
def upload_file():
    if request.method == 'POST':
        file = request.files['file']
        if file and __allowed_file(file.filename):
            filename = secure_filename(file.filename)

            p = os.path.join(app.config['UPLOADS'], filename)

            print ("Saved upload to `", p, "`")
            file.save(p)

            return json_response({ 'update': filename })

	# on GET just return simple form for uploading a file
    return'''
    <!doctype html>
    <title>Upload new File</title>
    <h1>Upload new File</h1>
    <form action="" method=post enctype=multipart/form-data>
      <p><input type=file name=file>
         <input type=submit value=Upload>
    </form>'''
# END DEBUGGING


# check allowed filename extensions
def __allowed_file(filename):
	return '.' in filename and \
			filename.rsplit('.', 1)[1].lower() in [x.lower() for x in app.config['ALLOWED_EXTENSIONS']]


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
	t = threading.Thread(target=factory_reset, args=(5, False, False, ))
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
def factory_reset(delay=5, reset_network=False, reset_clock=False):

	try:
		os.remove(app.config['SETTINGS'])
	except:
		pass

	print("Factory reset and restart in {0} seconds...".format(delay))
	time.sleep(delay)

	if app.config['IS_CME']:
		os.system("reboot")
	


