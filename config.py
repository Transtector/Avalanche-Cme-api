# Default CME device configuration.  This file should NOT be changed
# after release.  It's content is used to create a default running
# configuration - changes to which are persisted in a separate file,
# settings.json.  When settings.json is loaded during startup, the
# configuration values herein may be overridden.  To reset all config
# values to defaults, simply delete settings.json.

import os
import uuid
import errno
import platform

DEBUG = True

HOSTNAME = platform.node()
SYSTEM = platform.system()
IS_CME = HOSTNAME == 'cme'

APPROOT = os.path.abspath(os.getcwd()) # /home/pi/Cme
DOCROOT = os.path.join(APPROOT, 'cme') # /home/pi/Cme/cme
UPLOADS = os.path.join(APPROOT, 'tmp') # /home/pi/tmp

# logging to files
LOGDIR = os.path.join('log') # /home/pi/log
LOGBYTES = 1024 * 10
LOGCOUNT = 5

APPLOG = os.path.join(LOGDIR, 'cme.log')
SERVERLOG = os.path.join(LOGDIR, 'server.log')
ACCESSLOG = os.path.join(LOGDIR, 'access.log')

SNMPDIR = os.path.join(APPROOT, 'Cme-snmp')

RESET = os.path.join(APPROOT, 'cme-reset')
SETTINGS = os.path.join(APPROOT, 'settings.json')

# If RESET_FILE exists delete it and the SETTINGS_FILE
# so that the default values in config.py are used.
if os.path.isfile(RESET):
	os.remove(SETTINGS)
	os.remove(RESET)

def create_dir_if_not_exist(dir):
	''' try to create directory if it does not exist
		from http://stackoverflow.com/a/5032238 '''
	try:
		os.makedirs(dir)
	except OSError as e:
		if e.errno != errno.EEXIST:
			raise

# make sure we have uploads and log folders
create_dir_if_not_exist(UPLOADS)
create_dir_if_not_exist(LOGDIR)

ALLOWED_EXTENSIONS = ['txt', 'pdf', 'png', 'jpg']
MAX_CONTENT_LENGTH = 16 * 1024 * 1024 # 16 MB

SESSION_COOKIE_NAME = 'cmeSession'
SESSION_EXPIRATION = 86400 # 24 hours
SECRET_KEY = '99a83105bf3264465f2cd9c559d3c573' # md5('Kaelus0x0x0')

SERVER_HOST = '0.0.0.0' # listen all interfaces
SERVER_PORT = 80 # ports < 1024 require sudo to start

USERNAME = 'admin'
PASSHASH = 'b56e0b4ea4962283bee762525c2d490f' # md5('Welcome1')

DEVICE_MODEL_NUMBER = "CME-1000A"
DEVICE_SERIAL_NUMBER = "100A00123"
DEVICE_FIRMWARE = "0.1.0"

GENERAL_NAME = "My CME"
GENERAL_DESCRIPTION = "Prototype CME"
GENERAL_LOCATION = ""

SUPPORT_CONTACT = ""
SUPPORT_EMAIL = ""
SUPPORT_PHONE = ""

# default NTP settings
TIME_USE_NTP = True
TIME_NTP_SERVERS = ['0.pool.ntp.org', '1.pool.ntp.org', '2.pool.ntp.org']
TIME_ZONE_OFFSET = "+00:00"

# default network settings - mirror changes in the deployed interfaces files
# (see Cme/ref/interfaces_static; deploys to /etc/network/interfaces_static)
MAC = str(':'.join(['{:02x}'.format((uuid.getnode() >> i) & 0xff) for i in range(0,8*6,8)][::-1])).upper()
DHCP = False
ADDRESS = '192.168.1.30'
NETMASK = '255.255.255.0'
GATEWAY = '192.168.1.1'
PRIMARY = '8.8.4.4'
SECONDARY = '8.8.8.8'

