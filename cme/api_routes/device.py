# api/device routes

import os

from . import (router, app, settings, request, path_parse, secure_filename, refresh_device,
	allowed_file, json_response, json_error, json_filter, require_auth)

@router.route('/device/')
@router.route('/device/modelNumber')
@router.route('/device/serialNumber')
@router.route('/device/firmware')
def device_read_only_settings():
	''' Read-only device settings - NOT password protected.
		These are saved in settings, but under the "__device" key.
	'''
	# parse out the setting name (last element of request path)
	segments = path_parse(request.path)
	item = segments[-1]

	# device requests need to check for update files
	refresh_device()

	if item == 'device':
		return json_response({ 'device': json_filter(settings['__device'].items()) })
	else:
		return json_response({ item: settings['__device'][item] })


# update firmware (POST file or path to /device/update)
@router.route('/device/update', methods=['GET', 'POST'])
@require_auth
def device_update():
	filename = settings['__device']['__update']

	if request.method == 'POST':
		# handle upload new firmware
		file = request.files['file']

		if file and allowed_file(file.filename):
			filename = secure_filename(file.filename)
			p = os.path.join(app.config['UPLOADS'], filename)
			file.save(p)

			logger = logging.getLogger('cme')
			logger.info("File uploaded: {0}".format(p))

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

