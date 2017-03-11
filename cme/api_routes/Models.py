import os, glob, fcntl, tempfile, json, uuid, re

import rrdtool

from . import Config
from ..common import is_a_docker
from ..common.Switch import switch
from ..common.LockedOpen import LockedOpen


# Channel data and configuration are stored here (typically /data/channels/)
CHDIR = Config.PATHS.CHDIR

# cme layer _always_ runs as if the cme-mc is sitting on localhost
# at the default port (42217).  This is because the cme-mc layer
# maps the port to the host system at runtime, and the cme layer uses
# the host's network (--net=host) at runtime.
RRDCACHED = Config.RRD.RRDCACHED


class ChannelManager:

	def __init__(self):
		''' The ChannelManager uses a hybrid approach between the 'rrdcached' daemon process 
			and the (shared) CHDIR location.

			Normally, all the CME system containers have the DATA (/data by default)
			mounted as a shared volume.  The CME host system maintains this directory,
			and it provides the central repository for all things CME related
			including channel data logging to round-robin databases (i.e., RRD's).

			Channel data and configuration is shared in a subdirectory of the DATA
			volume (typically /data/channels/) called CHDIR.

			To clear an RRD, ChannelManager places a "chX.rrd.reset" file to be detected
			by the Cme-hw update.  The channel RRD will be created and the .reset file
			will be deleted.

			To get a list of available channel RRD's, ChannelManager just globs the CHDIR
			against the pattern 'ch*.rrd'.

			This all works fine on the typical deployment platform (i.e., the CME RPi), but
			is not easily checked if you're working from e.g. a Mac laptop.  The rrdcached
			calls work fine just by changing the RRDCACHED config to the machine
			running the Cme-mc container, but the direct manipulations of the CHDIR will
			not work properly unless you do something fancy to access the CHDIR on the
			machine hosting the actual volume. 
		'''

		# cache channels for quick subsequent retrieval as only the 
		# sensor/control data will generally be changing
		self._Channels = {}


	def clear_channel_history(self, ch_id):
		''' Clears the RRD for the identified channel by
			deleting the RRD.  It will get recreated by
			the Cme-hw loop.
		'''

		# force rebuild Channel to cache
		if ch_id in self._Channels:
			del self._Channels[ch_id]

		if not ch_id in self.channelRrds:
			return

		ch_rrd_reset = ch_id + '.rrd.reset'

		# create or overwrite any existing chX.rrd.reset file
		open(os.path.join(CHDIR, ch_rrd_reset), 'w').close()


	def clear_channel_alarms(self, ch_id):
		''' Clears the channel alarms for the identified channel
			by setting the 'chX.alarms.reset' signal file.
		'''
		if not ch_id in self.channels:
			return

		ch_alarms_reset = ch_id + '.alarms.reset'

		# create or overwrite any existing chX.rrd.reset file
		open(os.path.join(CHDIR, ch_alarms_reset), 'w').close()


	def get_channel(self, ch_id):
		''' Returns a Channel object with most recent data from the
			identified channel's RRD.
		'''

		# check if channel still available and 
		# remove it from internal list if not
		if not ch_id in self.channels:
			if ch_id in self._Channels:
				del self._Channels[ch_id]

			return None

		# Channels are updated with latest values
		# during creation, but need explicit
		# call to update if they've already
		# been created and are just being polled.
		if ch_id in self._Channels:
			return self._Channels[ch_id].update()

		# else return newly created/added channel
		return self._Channels.setdefault(ch_id, Channel(ch_id))


	@property
	def channels(self):
		''' Returns a list of available channels by listing
			the channel RRD's found in the CHDIR.
		'''
		chans = self._list_channels_by_config()
		return sorted(os.path.basename(p).split('_')[0] for p in chans)


	@property
	def channelRrds(self):
		''' Returns a list of available channels by listing
			the channel RRD's found in the CHDIR.
		'''
		rrds = self._list_channels_by_rrd()
		return sorted(os.path.basename(p).split('_')[0] for p in rrds)


	def _list_channels_by_rrd(self):
		''' private function to poll the channels folder for channel RRD's '''

		# will glob for all ch RRD reset files
		rrd_reset_pattern = os.path.join(CHDIR, 'ch*.rrd.reset')

		# lists all channel id's for which a reset file exists: [ 'ch0', 'ch1', 'chx(y)', ... ]
		rrd_reset_list = glob.glob(rrd_reset_pattern)
		
		# DEBUGGING - restrict returned channels by filtering ch_id's:
		#rrd_reset_list = [ 'ch0' ]

		# will glob for all channel RRD files (they are named like 'ch7_456789321.rrd')
		rrd_pattern = os.path.join(CHDIR, 'ch*.rrd')

		# skips channel RRD's if pending reset 
		rrd_list = [ p for p in glob.glob(rrd_pattern) if p not in rrd_reset_list ]

		return rrd_list


	def _list_channels_by_config(self):
		# will glob for all channel config files (they are named like 'ch7_config.json')
		cfg_pattern = os.path.join(CHDIR, 'ch*_config.json')

		return glob.glob(cfg_pattern)



class Channel():

	def __init__(self, id): 

		self.id = id # e.g., 'ch0'
		
		self.rrd = self._get_channel_rrd() # e.g., 'ch0_1466802992.rrd', might be None

		self.error = False # add 'error' dict item for serialized object

		# Read most recent RRD info, set first_ and last_ 
		# update timestamps and set sensor datasources from the
		# channel RRD (if any)
		self.last_update = 0
		self.first_update = 0
		self._datasources = self._get_datasources()

		#print("{0} DATASOURCES: {1}".format(self.id, self._datasources))

		# Load config from file.  Sensors will look at ch_ds to
		# find matching data sources loaded from RRD
		self.sensors = []
		self._configpath = os.path.join(CHDIR, id + '_config.json') # e.g., 'ch0_config.json'
		self._configmod = 0 # watch the file last modified time
		self.load_config()



	### PUBLIC METHODS

	def update(self):
		''' Check for channel config file changes and reload if any.  This gives us
			support for editing channels outside of the running API server while picking
			up the changes without forcing a server restart.  Normally channel updates
			from the API calls will also update the configuration file, but will also
			update the associated file modification time to avoid unnecessary reads from file. 
		'''
		if self._configmod != os.stat(self._configpath).st_mtime:
			self.load_config()


		''' read channel RRD for updated information before returning self '''
		self._datasources = self._get_datasources()

		# push new sensor timestamps and last_ds values
		for s in self.sensors:
			s.update()

		return self


	def load_history(self, resolution='live'):

		for case in switch(resolution.lower()):
			if case('daily'):
				s = '-1d' # last day
				r = '5m' # at 5 minute resolution
				break

			if case('weekly'):
				s = '-7d' # last week
				r = '30m' # at 30 min resolution
				break

			if case('monthly'):
				s = '-31d' # last month (31 days)
				r = '2h' # 2 hour resolution
				break

			if case('yearly'):
				s = '-365d' # last year (365 days)
				r = '1d' # 1 day resolution
				break

			if case(): # live
				resolution = 'live'
				s = '-15m' # last 15 minutes
				r = '1' # at 1 second resolution

		# Use average, minimum, and maximum consolidation functions (CFS)
		# for any history resolution other than "live".
		CFS = ['AVERAGE', 'MIN', 'MAX'] if resolution.lower() != 'live' else ['LAST']

		# this call will write to self.data (or self.error)
		self._rrdfetch(CFS, s, r)


	def clear_history(self):

		self.data = None


	def clear_alarms(self):

		self.alarms = None


	def load_alarms(self):
		self.alarms = None

		ch_alarms_file = os.path.join(CHDIR, self.id + '_alarms.json')

		# just return if channel alarms are being reset
		if os.path.isfile(os.path.join(CHDIR, self.id + '.alarms.reset')):
			return

		# read alarms from file
		if os.path.isfile(ch_alarms_file):
			with open(ch_alarms_file, 'r') as f:
				self.alarms = json.load(f)


	def load_config(self):

		# Load user-configurable attributes for the channel.  Channel's sensors
		# have been detected and are in the sensors attribute.
		cfg = {}
		if os.path.isfile(self._configpath):
			with open(self._configpath, 'r') as f:
				try:
					cfg = json.load(f)
				except Exception as e:
					self.error = e # TODO: we might want to log this to the API log
					return 

		# set the file last modified time
		self._configmod = os.stat(self._configpath).st_mtime

		# Default values written to __dict__ attributes to avoid 
		# triggering the property setters during init
		name = 'Ch ' + str(int(self.id[2:]) + 1)
		self.__dict__['name'] = cfg.get('name', name)
		self.__dict__['description'] = cfg.get('description', name + ' description')
		self.__dict__['recordAlarms'] = cfg.get('recordAlarms', False)
		self.__dict__['rra'] = cfg.get('_config', {}).get('rra', {})
		
		# clear and add any sensor configuration
		self.sensors = []
		for s_cfg in cfg.get('sensors',[]):
			self.sensors.append(Sensor(self, s_cfg['id'], s_cfg))


	def save_config(self):
		cfg = {}

		# load current config, if any
		if os.path.isfile(self._configpath):
			with open(self._configpath, 'r') as f:
				try:
					cfg = json.load(f)
				except Exception as e:
					self.error = e # fail and return if no current channel config
					return


		# Update the writable portion of the configuration
		# with new values
		cfg.update({
			'name': self.name,
			'description': self.description,
			'recordAlarms': self.recordAlarms
		})

		# for each configured sensor (if there are any)
		for s in cfg.get('sensors', []):
			# find matching sensor id from channel sensors model
			found_s = next((cs for cs in self.sensors if cs.id == s['id']), None)

			if found_s:
				# update name and thresholds attributes in config
				s.update({ 
					'name': found_s.name,
					'nominal': found_s.nominal,
					'display_range': found_s.display_range,
					'thresholds': [ { 'value': th.value, 'direction': th.direction, 'classification': th.classification } for th in found_s.thresholds ]
				})

		# save to disk
		with LockedOpen(self._configpath, 'a') as f:
			with tempfile.NamedTemporaryFile('w', dir=os.path.dirname(self._configpath), delete=False) as tf:
				json.dump(cfg, tf, indent="\t")
				tempname = tf.name
			try:
				os.chmod(tempname, 0o666) # set rw for u, g, o
				os.replace(tempname, self._configpath) # atomic on Linux
			except OSError:
				os.remove(tempname)

			# set the file last modified time
			self._configmod = os.stat(self._configpath).st_mtime


	### CHANNEL PROPERTIES (when set, these properties save the underlying __dict__ to disk)

	@property
	def name(self):
		return self.__dict__['name']

	@name.setter
	def name(self, value):
		self.__dict__['name'] = value # this is the attr that gets serialized to json - keep in sync
		self.save_config()

	@property
	def description(self):
		return self.__dict__['description']
	
	@description.setter
	def description(self, value):
		self.__dict__['description'] = value # this is the attr that gets serialized to json - keep in sync
		self.save_config()

	@property
	def recordAlarms(self):
		return self.__dict__['recordAlarms']

	@recordAlarms.setter
	def recordAlarms(self, value):
		self.__dict__['recordAlarms'] = value
		self.save_config()

	@property
	def rra(self):
		return self.__dict__['rra']


	### PRIVATE METHODS

	def _get_channel_rrd(self):
		''' glob for channel rrd filename '''
		
		rrd_pattern = os.path.join(CHDIR, self.id + '_*.rrd')
		rrd = glob.glob(rrd_pattern)

		if rrd:
			#print("{0} RRD: {1}".format(self.id, rrd[0]))
			return os.path.basename(rrd[0])

		return None


	def _get_datasources(self):

		# reading _channel_info can encounter errors
		# so we reset them here, read, then check error status
		self.error = False

		# Get most recent RRD info (flush first)
		ch_info = self._channel_info(True)

		if not ch_info:
			return

		# Most recent timestamp is in ch_info header
		self.last_update = ch_info['last_update']

		# first update is either right now, or use RRD filename timestamp
		self.first_update = int(self.rrd.split('_')[1].split('.')[0])

		# parse DS objects into cached dict
		ds_obj = {}

		# parse all DS from ch_info
		ds_raw = { k:ch_info[k] for k in ch_info if k.lower().startswith('ds') }
		
		for k, v in ds_raw.items():
		
			# e.g., k = 'ds[s0_VAC_Vrms].last_ds', v = 0.020578

			split = k.split(']') # [ 'ds[s0_VAC_Vrms', '.last_ds' ]
			ds_name = split[0].split('[')[1] # 's0_VAC_Vrms'
			ds_attr = split[1].split('.')[1] # 'last_ds'

			ds_obj.setdefault(ds_name, {}).update({ ds_attr: v })

		return ds_obj


	def _channel_info(self, flush_first=True):
		''' Calls the rrdtool.info on the channel RRD directly.  This will
			also flush the rrdcached and get most recent information.
		'''
		
		if not self.rrd or not os.path.isfile(os.path.join(CHDIR, self.rrd)):
			# If the rrd is not found, it may be getting recreated
			# or it may be a different one, try to get it...
			self.rrd = _get_channel_rrd()

		if not self.rrd:
			return None

		# RRDCACHED_ADDRESS is set to a flag value if there
		# is no service.  We can still run cme layer however
		# and just return.
		'''  JJB:  commented out for use w/o RRDCached
		if RRDCACHED_ADDRESS.find('fail') > 0:
			if not self.error:
				self.error = "Error reading channel information [{0}]: RRD cache server not running.".format(self.rrd)
			return result

		args = (self.rrd, '-d', RRDCACHED_ADDRESS)

		if not flush_first:
			args = args + ('-F', )

		'''

		# Wrap the rrdtool call in try/except as something bad
		# may be going on with the RRD cache daemon.  We'll set
		# the channel error flag.
		result = None
		try:
			result = rrdtool.info(os.path.join(CHDIR, self.rrd))

		except Exception as e:
			self.error = "Error reading channel information [{0}]: {1}".format(self.rrd, e)

		return result


	def _rrdfetch(self, CFS, start, res):
		''' Does the heavy lifting of calling rrdtool.fetch for each
			CF in the CFS list and assembling the returned data
			in the self.data attribute.

				CFS:	list of RRD CF's ([str]) e.g., ['AVERAGE', 'MIN', 'MAX'], ['LAST']
				start:	starting time reference (str) e.g., '-30m', '-1d', ...
				res:	RRA resolution (str) e.g., '-5m', '1', '300', ...
		'''
		if not self.rrd:
			return

		rrd = os.path.join(CHDIR, self.rrd)

		for i, CF in enumerate(CFS):

			# see http://oss.oetiker.ch/rrdtool/doc/rrdfetch.en.html
			data = rrdtool.fetch(rrd, CF, '-a', '-s', start, '-r', res)

			if i == 0:
				# set initial fetch data
				self.data = data
			else:
				# append new trace data
				self.data += (data[2],)




class Sensor():
	''' Sensor objects provide read-only values depending on sensor type.

		Channel configuration (which includes sensor config) has been
		loaded at the point of Sensor object creation.
	'''
	def __init__(self, ch, id, cfg):

		self._ch = ch

		self.id = id
		self.type = cfg['_config']['type']
		self.unit = cfg['_config']['units']
		self.range = cfg['_config']['range'] # sensor range is [min, max] and may be empty

		self.value = 0
		self.update() # this will update self.value from ch.sensor_datasource, if any

		self.__save_config = ch.save_config # Just save whole channel if sensor attributes are changed		

		# We'll create the sensor attributes that are read/write by the user
		# here.  We use __dict__ here to avoid triggering unnecessary save to disk
		# when the attribute is set.

		self.__dict__['name'] = cfg.get('name', self.id)
		self.__dict__['nominal'] = cfg.get('nominal', 0)
		self.__dict__['display_range'] = cfg.get('display_range', self.range)
		self.thresholds = [ Threshold(th['value'], th['direction'], th['classification']) for th in cfg.get('thresholds', []) ]


	### PUBLIC MEHTODS

	def update(self):
		# Create a datasource key from id, type, and unit (e.g., s0_VAC_Vrms)
		# to search for a matching datasource for this sensor
		regex = re.compile('[^a-zA-Z0-9_]')
		clean_type = regex.sub('_', self.type)[:3]
		clean_unit = regex.sub('_', self.unit)[:3]
		ds_key = self.id + '_' + clean_type + '_' + clean_unit
		ds = self._ch._datasources and self._ch._datasources.get(ds_key, None)

		value = ds and ds.get('last_ds', None)
		self.value = float(value) if value else None

	
	def addThreshold(self, th_obj):
		th = Threshold(float(th_obj['value']), th_obj['direction'], th_obj['classification'])
		self.thresholds.append(th)
		self.__save_config()
		return th

	def removeThreshold(self, th):
		try:
			self.thresholds.remove(th)
			self.__save_config()
		except:
			pass

	def removeAllThresholds(self):
		try:
			self.thresholds = []
			self.__save_config()
		except:
			pass

	def modifyThreshold(self, th, th_obj):
		
		th.value = float(th_obj.get('value', th.value))
		th.direction = th_obj.get('direction', th.direction)
		th.classification = th_obj.get('classification', th.classification)
		self.__save_config()

		return th


	### PUBLIC PROPERTIES

	@property
	def name(self):
		return self.__dict__['name']

	@name.setter
	def name(self, value):
		self.__dict__['name'] = value
		self.__save_config()

	@property
	def nominal(self):
		return self.__dict__['nominal']

	@nominal.setter
	def nominal(self, value):
		self.__dict__['nominal'] = value
		self.__save_config()

	@property
	def display_range(self):
		return self.__dict__['display_range']

	@display_range.setter
	def display_range(self, value):
		self.__dict__['display_range'] = value
		self.__save_config()



class Threshold():
	''' Threshold object holds scalar values and properties to allow setting
		and acting upon sensor value comparisons.  These objects are created
		by the user and persisted within the channel configuration files.
	'''
	def __init__(self, value, direction, classification, id=None):
		self.id = id if id else str(uuid.uuid4())
		self.value = value
		self.direction = direction
		self.classification = classification


