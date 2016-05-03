# api/device routes

import os, threading

from . import (router, app, settings, request, path_parse, secure_filename, refresh_device,
	allowed_file, json_response, json_error, json_filter, require_auth)
from ..util.Reboot import restart

@router.route('/device/')
@router.route('/device/modelNumber')
@router.route('/device/serialNumber')
@router.route('/device/firmware')
@router.route('/device/recovery')
def device_read_only_settings():
	''' Read-only device settings - NOT password protected.
		These are saved in settings, but under the "__device" key.
	'''
	# parse out the setting name (last element of request path)
	segments = path_parse(request.path)
	item = segments[-1]

	# device requests need to check for update files
	refresh_device()

	# get visible device parameters
	device = json_filter(settings['__device'].items())

	# add 'recovery' flag depends on how config.py
	# loaded (i.e., the presence of a recovery flag file)
	device['recovery'] = app.config['RECOVERY']

	if item == 'device':
		# request all device parameters
		res = device
	else:
		# else just a specific item
		res = device[item]

	return json_response({ item: res })


@router.route('/device/update', methods=['GET', 'POST'])
@require_auth
def device_update():
	# update firmware (POST file or path to /device/update)
	
	filename = ''

	if request.method == 'POST':
		# handle upload new firmware
		file = request.files['file']

		if file and allowed_file(file.filename):
			filename = secure_filename(file.filename)
			path = os.path.join(app.config['UPLOADS'], filename)
			file.save(path)

			logger = logging.getLogger('cme')
			logger.info("File uploaded: {0}".format(p))

	else:
		refresh_device()
		filename = settings['__device']['__update']

	return json_response({ 'update': filename })


@router.route('/device/restart', methods=['GET'])
@require_auth
def device_restart():
	# Triggers a device reboot.  If there is an update available
	# it will be attempted to be used to replace the current
	# image (if any).  If all else, the reboot will drop into
	# recovery mode.

	# Factory reset deletes the settings.json file and performs a 
	# reboot.
	t = threading.Thread(target=restart, args=(5, ))
	t.setDaemon(True)
	t.start()

	return json_response(None)


# DEBUGGING
# Use this method to debug file uploads
@router.route('/device/up', methods=['GET', 'POST'])
@require_auth
def upload_file():
	if request.method == 'POST':
		file = request.files['file']
		if file and allowed_file(file.filename):
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

