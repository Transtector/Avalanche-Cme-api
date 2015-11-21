# api/config/device routes

import os.path as path
from . import router, app, settings, request, UriParse, secure_filename

from .auth import require_auth
from .util import json_response, json_error
from ..util.FileUtils import refresh_device

# api/config/device
# read-only device settings - NOT password protected
@router.route('/config/device/')
@router.route('/config/device/modelNumber')
@router.route('/config/device/serialNumber')
@router.route('/config/device/firmware')
def device_read_only_settings():
	# parse out the setting name (last element of request path)
	segments = UriParse.path_parse(request.path)
	item = segments[-1]

	# device requests need to check for update files
	refresh_device()

	if item == 'device':
		setting = settings[item]
	else:
		setting = settings['device'][item]

	return json_response({ item: setting })

# update firmware (POST file or path to /config/device/update)
@router.route('/config/device/update', methods=['GET', 'POST'])
@require_auth
def device_update():
	filename = settings['device']['update']

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
@router.route('/config/device/updateTrigger', methods=['POST'])
@require_auth
def device_trigger_update():
	return json_error([ 'Not implemented' ])


# DEBUGGING
# Use this method to debug file uploads
@router.route('/config/device/up', methods=['GET', 'POST'])
@require_auth
def upload_file():
    if request.method == 'POST':
        file = request.files['file']
        if file and __allowed_file(file.filename):
            filename = secure_filename(file.filename)

            p = path.join(app.config['UPLOADS'], filename)

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

