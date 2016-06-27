# api/device routes

import os, shutil, glob, threading, logging, fnmatch

import urllib.request
from xml.dom.minidom import parseString
import xml.dom.minidom

from . import (router, settings, request, path_parse, secure_filename, refresh_device,
	allowed_file, json_response, json_error, json_filter, require_auth)
from .. import Config
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

	# add 'recovery' flag depends on how Config.py
	# loaded (i.e., the presence of a recovery flag file)
	device['recovery'] = Config.RECOVERY

	if item == 'device':
		# request all device parameters
		res = device
	else:
		# else just a specific item
		res = device[item]

	return json_response({ item: res })


@router.route('/device/updates', methods=['GET', 'DELETE', 'PUT', 'POST'])
@require_auth
def device_updates():
	''' Firmware image update handling.  Works with HTTP verbs to act upon
		and/or return the available software updates and update status.

		GET: returns result object with current updates status:
	     	updates: {
				pending: false
				usb: [ < image filenames found on usb storage > ],
				web: [ < image urls found on web site > ],
				uploads: [ < image filenames found in uploads folder > ]
	     	}

	     DELETE: removes a pending update (NOP if no pending update)

	     POST: uploads a update image file which will replace any current uploaded image

	     PUT: move the indentified update to pending status (move file into pending update location)
	'''

	# result object
	result = { 
		'pending': False,  
		# Cme software image files can be placed in a special location to make them 'pending' updates.
		# The update location is checked after every Cme restart, and if a valid image is found it
		# will be used.  The 'pending' item will be either False or the image file name if one is
		# found.

		'usb': [],
		# Software images may be placed on external (USB) drive.  Any matching Cme images found
		# will have their base filenames listed in the 'usb' item list.

		'web': [],
		# Software images can be provided by our company web site.  We'll list available Cme
		# image base filenames in the 'web' item list.

		'uploads': []
		# Finally, users may upload Cme software images they might have on their device.  Only
		# one software image at a time may be uploaded, so new uploads will replace any current
		# one (for now at least, in order to minimize disk usage).  The 'uploads' item will
		# hold any base filename found.
	}

	# read configurable items into local variables
	update_dir = Config.UPDATE
	upload_dir = Config.UPLOAD_FOLDER
	usb_dir = Config.USB
	update_glob = Config.UPDATE_GLOB
	pub_url = Config.PUBLIC_UPDATES_URL

	logger = logging.getLogger('cme')

	# find pending updates (should be only one or none)
	pending_files = glob.glob(os.path.join(update_dir, update_glob))

	if len(pending_files) > 0:
		result['pending'] = os.path.basename(pending_files[0])
		pending = True
	else:
		pending = False

	if pending and request.method == 'DELETE':
		os.remove(pending_files[0])
		logger.info("Update `{0}` was removed.".format(os.path.basename(pending_files[0])))
		result['pending'] = False

	
	# from USB drive
	result['usb'] = [os.path.basename(path) for path in glob.glob(os.path.join(usb_dir, update_glob))]

	# from web (our distribution URL)
	# TODO: get official web repo for Cme updates set up
	try:
		with urllib.request.urlopen(pub_url) as response:
			web_listing_raw = response.read()

		web_listing_xml = xml.dom.minidom.parseString(web_listing_raw)
		ListBucketResult = web_listing_xml.documentElement

		# Get all the items in the S3 bucket
		items = ListBucketResult.getElementsByTagName('Contents')

		# Now filter for Cme items - these will have a Key property
		# that starts with 'Cme/' and the top-level Cme 'folder' will
		# just have Key = 'Cme/', so it can also be discarded.
		for item in items:
			key = item.getElementsByTagName('Key')[0].childNodes[0].data
			if key.startswith('Cme/') and key != 'Cme/' and fnmatch.fnmatch(key.split('/')[1], update_glob):
				result['web'].append(key.split('/')[1])
	except:
		logger.error("Error listing updates from web {0}".format(pub_url))


	# are we handling an upload (POST)?
	if request.method == 'POST':

		# handle upload new firmware
		file = request.files['files[]']

		if file and allowed_file(file.filename):
			
			filename = secure_filename(file.filename)
			path = os.path.join(upload_dir, filename)

			# clear UPLOAD_FOLDER before saving any new files
			# as these images can be big, and we've only got
			# so much space
			for old_file in os.listdir(upload_dir):
				old_path = os.path.join(upload_dir, old_file)
				try:
					if os.path.isfile(old_path):
						os.unlink(old_path)
				except:
					logger.error("Failed to clear uploads folder")

			file.save(path)
			logger.info("File uploaded: {0}".format(path))

		else:
			logger.error("File upload failed: {0}".format(file.filename))


	# finally, allow PUT to install an image to update folder
	error = False
	if request.method == 'PUT':
		source = request.get_json()['source']
		name = request.get_json()['name']

		
		# just copy USB source images
		if source.lower() == 'usb':
			src = os.path.join(usb_dir, name)
			if os.path.isfile(src):
				shutil.copy2(src, update_dir)
			else:
				error = True

		
		# copy web updates
		if source.lower() == 'web':
			try:
				# Download the file from `url` and save it locally under update_dir:
				with urllib.request.urlopen(pub_url + 'Cme/' + name) as src, open(os.path.join(update_dir, name), 'wb') as dst:
				    shutil.copyfileobj(src, dst)
			except:
				error = True


		# move uploaded updates
		if source.lower() == 'upload':
			src = os.path.join(upload_dir, name)
			if os.path.isfile(src):
				shutil.move(src, update_dir)
			else:
				error = True

		if error:
			logger.error("Failed to install {0}::{1}".format(source, name))
		else:
			logger.info("Update installed: {0}::{1}".format(source, name))
			result['pending'] = name


	# refresh the uploads listing after installs (PUT) because
	# any uploaded files are moved (not copied) on install
	result['uploads'] = [os.path.basename(path) for path in glob.glob(os.path.join(upload_dir, update_glob))]

	return json_response({ 'updates': result })



@router.route('/device/restart', methods=['GET'])
@require_auth
def device_restart():
	# Triggers a device reboot.  If there is an update image available
	# it will be attempted to be used in place of the current image,
	# if there is a current image. If the new image load fails for any
	# reason, the prior image will be used, or failing that, the Cme
	# will startup in recovery mode.
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

			p = os.path.join(Config.UPLOAD_FOLDER, filename)

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

