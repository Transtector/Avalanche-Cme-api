# Default CME device configuration.  This file should NOT be changed
# after release.  It's content is used to create a default running
# configuration - changes to which are persisted in a separate file,
# settings.json.  When settings.json is loaded during startup, the
# configuration values herein may be overridden.  To reset all config
# values to defaults, simply delete settings.json.

import os
import errno
import platform

DEBUG = True

SYSTEM = platform.system()
RUNNING_ON_PI = SYSTEM == 'Linux' # prevent commands from exec on dev machine

DOCROOT = os.path.abspath(os.path.join(os.getcwd(), 'cme'))
UPLOADS = os.path.join(os.getcwd(), 'tmp')
SNMPDIR = os.path.abspath('/home/pi/Cme-snmp/')

# create UPLOADS if it's not there yet
# from http://stackoverflow.com/a/5032238
try:
	os.makedirs(UPLOADS)
except OSError as exception:
	if exception.errno != errno.EEXIST:
		raise

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

TIME_USE_NTP = True
TIME_NTP_SERVERS = ['0.pool.ntp.org', '1.pool.ntp.org', '2.pool.ntp.org']
TIME_ZONE_OFFSET = "+00:00"
