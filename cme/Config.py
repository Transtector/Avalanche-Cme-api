# Default CME device configuration.  This file should NOT be changed
# after release.  It's content is used to create a default running
# configuration - changes to which are persisted in a separate file,
# settings.json.  When settings.json is loaded during startup, the
# configuration values herein may be overridden.  To reset all config
# values to defaults, simply delete settings.json.

import os, uuid, platform, json

DEBUG = True

HOSTNAME = platform.node()
SYSTEM = platform.uname()

APPROOT = os.path.abspath(os.getcwd()) # /root

#DOCROOT = os.path.join(APPROOT, 'cme') # /root/cme
#SNMPDIR = os.path.abspath(os.path.join(APPROOT, '../Cme-snmp')) # /root/Cme-snmp
#HWDIR = os.path.abspath(os.path.join(APPROOT, '../Cme-hw')) # /root/Cme-hw

USERDATA = os.path.abspath('/data') # Cme user data is stored here

# uploads go to temp folder above app
# this name is used by Flask as well
UPLOAD_FOLDER = os.path.abspath(os.path.join(USERDATA, 'tmp')) # /data/tmp

# updates are pending until restart, then removed if successful
UPDATE = os.path.abspath(os.path.join(USERDATA, 'update')) # /data/update

# updates can be put on USB (removable) media
USB = os.path.abspath('/media/usb')


# globbing pattern for update image files
UPDATE_GLOB = '1500-???-v*-SWARE-CME*.tgz'
PUBLIC_UPDATES_URL = 'https://s3.amazonaws.com/transtectorpublicdownloads/'


# logging to files in parent foldr
LOGDIR = os.path.abspath(os.path.join(USERDATA, 'log')) # /data/log
LOGBYTES = 1024 * 10
LOGCOUNT = 5

APPLOG = os.path.join(LOGDIR, 'cme.log')
SERVERLOG = os.path.join(LOGDIR, 'server.log')
ACCESSLOG = os.path.join(LOGDIR, 'access.log')

# rrdcached is a cache service wrapping the rrd tool
# See rrdtool.org for details.  Default address is
# the name of the docker running the rrdcached service
# "cme-mc".  The default port is 42217.
RRDCACHED_ADDRESS = 'cme-mc'

# user-defined API layer settings are kept here
SETTINGS = os.path.join(USERDATA, 'settings.json')

# recovery mode flag is signaled by presence of this file
RECOVERY = os.path.isfile(os.path.join(APPROOT, 'recovery.txt'))

# create USERDATA folders if they don't yet exist
for p in [ UPLOAD_FOLDER, UPDATE, LOGDIR ]:
	if not os.path.exists(p):
		os.makedirs(p)


# this for uploading files (ostensibly firmware files)
# TODO: figure out size/extension for actual firmware files
ALLOWED_EXTENSIONS = ['tgz', 'tar.gz']
MAX_CONTENT_LENGTH = 500 * 1024 * 1024 #  500 MB

SESSION_COOKIE_NAME = 'cmeSession'
SESSION_EXPIRATION = 86400 # 24 hours
SECRET_KEY = '99a83105bf3264465f2cd9c559d3c573' # md5('Kaelus0x0x0')

SERVER_HOST = '0.0.0.0' # listen all interfaces
SERVER_PORT = 80 # ports < 1024 require sudo to start

USERNAME = 'admin'
PASSHASH = 'b56e0b4ea4962283bee762525c2d490f' # md5('Welcome1')

# CME Device info is 'hard-coded' into the device.json
# read-only file in the USERDATA folder.
try:
	with open(os.path.join(USERDATA, 'device.json'), "r") as f:
		device_data = json.load(f)
except:
	device_data = { 'modelNumber': 'UNKNOWN', 'serialNumber': '00000000' }

DEVICE_MODEL_NUMBER = device_data['modelNumber']
DEVICE_SERIAL_NUMBER = device_data['serialNumber']

# The firmware version is stored right here (for now)
DEVICE_FIRMWARE = "0.1.0"

GENERAL_NAME = "My CME"
GENERAL_DESCRIPTION = "Prototype CME"
GENERAL_LOCATION = ""

SUPPORT_CONTACT = ""
SUPPORT_EMAIL = ""
SUPPORT_PHONE = ""

# CME Temperature configuration

class TemperatureUnits:
	CELSIUS = 0
	FAHRENHEIT = 1

TEMPERATURE_DISPLAY_UNITS = TemperatureUnits.CELSIUS
TEMPERATURE_WARNING_TEMP = 65 # ºC
TEMPERATURE_ALARM_TEMP = 80 # ºC


# CME Clock configuration
# These settings are read from the /etc/network configuration.  On factory
# resets, the network can (optionally) be reset as well.
# (see Cme/ref/interfaces_static; deploys to /etc/network/interfaces_static)
from cme.util.ClockUtils import check_ntp, ntp_servers

# default NTP settings are obtained from /etc/ntp.conf
CLOCK_USE_NTP = check_ntp()
CLOCK_NTP_SERVERS = ntp_servers()
CLOCK_ZONE_OFFSET = 0

# lookup for clock display reference zone
# this is manually duplicated in client code,
# so be careful when making changes
class RelativeTo:
	UTC = 0 # display times relative to UTC (zone offset = 0)
	CmeLocal = 1 # display times relative to Cme's zone offset
	Local = 2 # display times relative to the client zone


# clock display settings
# see momentjs.org for valid display formats
CLOCK_DISPLAY_RELATIVE_TO = RelativeTo.UTC
CLOCK_DISPLAY_12HOUR = False
CLOCK_DISPLAY_DATE_FORMAT = "YYYY-MM-DD" 
CLOCK_DISPLAY_24HOUR_FORMAT = "HH:mm:ss"
CLOCK_DISPLAY_12HOUR_FORMAT = "h:mm:ss A"


# CME Network configuration
# These settings are read from the /etc/network configuration.  On factory
# resets, the network can (optionally) be reset as well.
# (see Cme/ref/interfaces_static; deploys to /etc/network/interfaces_static)
from cme.util.IpUtils import mac, dhcp, address, netmask, gateway

# just read the MAC
MAC = mac()

DHCP = dhcp() # False
ADDRESS = address() # 192.168.1.30
NETMASK = netmask() # 255.255.255.0
GATEWAY = gateway() # 192.168.1.1
PRIMARY = '8.8.4.4'
SECONDARY = '8.8.8.8'
