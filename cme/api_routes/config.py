# CME device and configuration API route handlers
from . import app, router, settings, request, UriParse, secure_filename

from .auth import require_auth
from .util import json_response, json_error, json_filter
from ..util.IpUtils import set_dhcp, write_network_addresses
from ..util.ClockUtils import refresh_time, ntp_servers

import os, time, threading, logging

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
	__refresh_device()

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

		if file and __allowed_file(file.filename):
			filename = secure_filename(file.filename)
			p = os.path.join(app.config['UPLOADS'], filename)
			file.save(p)

			logger = logging.getLogger('cme')
			logger.info("File uploaded: {0}".format(p))

	__refresh_device()

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


# top-level configuration
@router.route('/config/', methods=['GET', 'POST'])
@require_auth
def config():
	if request.method == 'POST':
		return json_error([ 'Not implemented' ])

	__refresh_device()
	refresh_time(settings['clock'])

	return json_response({ 'config': json_filter(settings.items()) })


@router.route('/config/reset', methods=['POST'])
@require_auth
def reset():

	reset_network = request.get_json()['reset_network']
	reset_clock = request.get_json()['reset_clock']
	
	# Factory reset deletes the settings.json file and performs a 
	# reboot.
	t = threading.Thread(target=__reset, args=(5, False, False, ))
	t.setDaemon(True)
	t.start()

	# Return nothing (but status = 200) to let 'em know we're resetting
	return json_response(None)



# check for firmware update file presence
def __refresh_device():
	''' Check uploads folder for any contents.  There should only
		be at most a single file which will be used if an update
		is triggered.'''

	files = [fn for fn in os.listdir(app.config['UPLOADS'])
			if any(fn.endswith(ext) for ext in app.config['ALLOWED_EXTENSIONS'])]

	# choose the first one, if any
	settings['__device']['__update'] = '' if len(files) == 0 else files[0]


def __reset(delay=5, reset_network=False, reset_clock=False):
	''' Performs the factory reset with optional network and clock (ntp) configuration reset.

		Basic reset simply removes the current user settings (typically found in /data/settings.json,
		but look at app.config['SETTINGS'] key to see where it might be).

		Network reset:
			1) Turn off DHCP network config
			1) Write default static addresses
			-- Network will reset to defaults after reboot

		NTP reset:
			1) Write default NTP servers
			2) Enable the ntp service
			-- NTP will reset to defaults after reboot

	'''
	try:
		os.remove(app.config['SETTINGS'])

	except:
		pass


	if reset_network:
		set_dhcp(False)
		write_network_addresses({ 
			'address': '192.168.1.30', 
			'netmask': '255.255.255.0', 
			'gateway': '192.168.1.1',
			'primary': '8.8.4.4',
			'secondary': '8.8.8.8' 
		})


	if reset_clock:
		ntp_servers([ 
			'0.debian.ntp.pool.org', 
			'1.debian.ntp.pool.org', 
			'2.debian.ntp.pool.org', 
			'3.debian.ntp.pool.org' 
		])
		os.system('systemctl enable ntp')


	logger = logging.getLogger('cme')
	logger.info("Factory reset (network reset: {0}, clock reset: {1}) -- rebooting in {2} seconds.".format(reset_network, reset_clock, delay))	
	
	time.sleep(delay)

	# reboot system
	os.system("reboot")
	


# check allowed filename extensions
def __allowed_file(filename):
	return '.' in filename and \
			filename.rsplit('.', 1)[1].lower() in [x.lower() for x in app.config['ALLOWED_EXTENSIONS']]


