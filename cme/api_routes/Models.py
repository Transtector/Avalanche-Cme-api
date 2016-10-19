import os, glob, time

import rrdtool

from . import settings, Config
from ..util.Switch import switch

# Override Config RRDCACHED_ADDRESS here for DEBUG.
# No need to specify the port if the default (42217) is used.
rrdcached_address = Config.RRDCACHED_ADDRESS


class ChannelManager:

	def __init__(self):
		''' The ChannelManager uses a hybrid approach between the 'rrdcached' daemon process 
			and the (shared) LOGDIR location.

			Normally, all the CME system containers have the LOGDIR (/data/log by default)
			mounted as a shared volume.  The CME host system maintains this directory,
			and it provides the central repository for all things CME logging related
			including channel data logging to round-robin databases (i.e., RRD's).

			The rrdcached daemon manages the channel RRD's and is used by Cme-hw to create
			and update the channel RRD's.  The ChannelManager ideally just reads the data
			captured in the channel RRD's, but it must also support additional methods
			like clearing the RRD's (basically a reset) and listing the available RRD's.

			Since the rrdcached doesn't support these additional functions (clearing, listing)
			the ChannelManager just works with the LOGDIR folder contents directly.

			To clear an RRD, ChannelManager places a "chX.rrd.reset" file to be detected
			by the Cme-hw update.  The channel RRD will be created and the .reset file
			will be deleted.

			To get a list of available channel RRD's, ChannelManager just globs the LOGDIR
			against the pattern 'ch*.rrd'.

			This all works fine on the typical deployment platform (i.e., the CME RPi), but
			is not easily checked if you're working from e.g. a Mac laptop.  The rrdcached
			calls work fine just by changing the RRDCACHED_ADDRESS config to the machine
			running the Cme-mc container, but the direct manipulations of the LOGDIR will
			not work properly unless you do something fancy to access the LOGDIR on the
			machine hosting the actual volume. 

			I can run the Cme API layer on my Mac while using the Cme-hw and Cme-mc running
			on my development Pi (cme-dev.local) by mounting the Pi's Data/ shared folder
			to my Mac's under /Volumes/Data and creating a symlink to it from /data.

			This requires my cme-dev to have been setup with avahi/netatalk properly with
			the /data folder shared with the pi user.  Edit /etc/netatalk/AppleVolumes.default
			and add the following line at the bottom:

			/data	"Data"	allow:pi	options:upriv,usedots

			and restart netatalk:

			(cme-dev) $ service netatalk restart

			Then, mount the cme-dev.local Data/ share from Finder.  Just connect to it
			using the pi:raspberry user and double-click the Data share to mount it.

			Finally, if it's not already there, create a symbolic link to the new Data
			mount as:

			(mac) $ sudo ln -sf /Volumes/Data /data
		'''

		# cache channels for quick subsequent retrieval as only the 
		# sensor/control data will generally be changing
		self._Channels = {}


	def clear_channel(self, ch_id):
		''' Clears the RRD for the identified channel by
			deleting the RRD.  It will get recreated by
			the Cme-hw loop.
		'''
		if not ch_id in self._list_channels():
			return

		# force rebuild Channel to cache
		if ch_id in self._Channels:
			del self._Channels[ch_id]

		ch_rrd_reset = ch_id + '.rrd.reset'

		# create or overwrite any existing chX.rrd.reset file
		open(os.path.join(Config.LOGDIR, ch_rrd_reset), 'w').close()


	def get_channel(self, ch_id):
		''' Returns a Channel object with most recent data from the
			identified channel's RRD.
		'''

		# check if channel still available and 
		# remove it from internal list if not
		if not ch_id in self._list_channels():
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
		return self._Channels.setdefault(ch_id, Channel(ch_id, self._get_channel_rrd(ch_id)))


	def debug_channels(self, count=10):
		i = 0

		while (i < count):
			i = i + 1
			time.sleep(1)

			for ch in self.channels:
				ch_obj = self.get_channel(ch)
				print("Channel {0} ---".format(ch_obj.id))
				print("\t".join([ "{0}: {1}".format(s.id, s.value) for s in ch_obj.sensors ]))


	@property
	def channels(self):
		''' Returns a list of available channels by listing
			the channel RRD's found in the LOGDIR.
		'''
		return sorted(self._list_channels())


	def _list_channels(self):
		''' private function to poll the /data/log folder for channel RRD's '''

		# will glob for all ch RRD reset files
		rrd_reset_pattern = os.path.join(Config.LOGDIR, 'ch*.rrd.reset')

		# lists all channel id's for which a reset file exists: [ 'ch0', 'ch1', 'chx(y)', ... ]
		rrd_reset_list = [ os.path.basename(p).split('.')[0] for p in glob.glob(rrd_reset_pattern)]
		
		# DEBUGGING - restrict returned channels by filtering ch_id's:
		#rrd_reset_list = [ 'ch0' ]

		# will glob for all channel RRD files (they are named like 'ch7_456789321.rrd')
		rrd_pattern = os.path.join(Config.LOGDIR, 'ch*.rrd')

		# skips channel RRD's if pending reset 
		rrd_list = [ os.path.basename(p).split('_')[0]
			for p in glob.glob(rrd_pattern) 
			if os.path.basename(p).split('_')[0] not in rrd_reset_list ]

		return rrd_list


	def _get_channel_rrd(self, ch_id):
		''' glob for channel rrd filename '''
		
		rrd_pattern = os.path.join(Config.LOGDIR, ch_id + '_*.rrd')
		rrd = glob.glob(rrd_pattern)

		if rrd:
			return os.path.basename(rrd[0])

		return None


class Channel:

	def __init__(self, id, rrd): 

		self.id = id # e.g., 'ch0'
		self.rrd = rrd # e.g., 'ch0_1466802992.rrd'

		''' user-settable channel settings are cached in settings['__channels'] by channel id '''
		if not self.id in settings['__channels']:
			chs = settings['__channels']
			chs[self.id] = {}
			settings['__channels'] = chs

			# give a 1-based channel name (e.g., 'Ch 1' see issue RD20160280-11)
			self.name = 'Ch ' + str(int(self.id[2:]) + 1)
			self.description = self.name + ' description'

		self.sensors = []
		self.controls = []

		# Add __dict__ properties to this instance for serialization
		self.__dict__['name'] = self.name
		self.__dict__['description'] = self.description

		# TODO: carry Cme-hw channel errors over?  Not sure how...
		self.error = False
		self.__dict__['error'] = self.error

		self.last_update = 0
		self.first_update = 0
		self.ch_ds = {}

		# read most recent RRD info, set first_ and last_ 
		# update timestamps and refresh ch_ds
		self._update_rrd_info()

		# push the ch_ds into new Sensor objects
		for ds_id, ds_obj in self.ch_ds.items():
			self.sensors.append(Sensor(id, ds_id, ds_obj))

		# TODO: Add channel controls...


	def update(self):
		''' read channel RRD for updated information before returning self '''
		self._update_rrd_info()

		# push new sensor timestamps and last_ds values
		for s in self.sensors:
			ds_name = "_".join([ s.id, s.type, s.unit ])
			s.value = float(self.ch_ds[ds_name]['last_ds'])

		return self


	def load_history(self, resolution='realtime'):

		for case in switch(resolution.lower()):
			if case('daily'): pass
			if case('weekly'): pass
			if case('monthly'): pass
			if case('yearly'):
				break

			if case():
				# default - "realtime"
				args = ("LAST", "-a", "-s", "-15m")

		self.__dict__['data'] = rrdtool.fetch(self.rrd, "-d", rrdcached_address, *args)


	def clear_history(self):
		if 'data' in self.__dict__:
			del self.__dict__['data']

	@property
	def name(self):
		return settings['__channels'][self.id]['name']

	@name.setter
	def name(self, value):
		chs = settings['__channels']
		chs[self.id]['name'] = value
		settings['__channels'] = chs
		self.__dict__['name'] = value # this is the attr that gets serialized to json - keep in sync

	@property
	def description(self):
		return settings['__channels'][self.id]['description']
	
	@description.setter
	def description(self, value):
		chs = settings['__channels']
		chs[self.id]['description'] = value
		settings['__channels'] = chs
		self.__dict__['description'] = value # this is the attr that gets serialized to json - keep in sync

	@property
	def error(self):
		return self.__dict__['error']

	@error.setter
	def error(self, value):
		self.__dict__['error'] = value
	
	def _update_rrd_info(self):

		# reading _channel_info can encounter errors
		# so we reset them here, read, then check error status
		self.error = False

		# Get most recent RRD info (flush first)
		ch_info = self._channel_info(True)

		if self.error:
			return

		# Most recent timestamp is in ch_info header
		self.last_update = ch_info['last_update']

		# first update is either right now, or use RRD filename timestamp
		self.first_update = int(self.rrd.split('_')[1].split('.')[0])

		# parse all DS from ch_info
		ch_ds_raw = { k:ch_info[k] for k in ch_info if k.lower().startswith('ds') }
		
		# parse DS objects into cached dict
		for k, v in ch_ds_raw.items():
		
			# e.g., k = 'ds[s0_VAC_Vrms].last_ds', v = 0.020578

			split = k.split(']') # [ 'ds[s0_VAC_Vrms', '.last_ds' ]
			ds_name = split[0].split('[')[1] # 's0_VAC_Vrms'
			ds_attr = split[1].split('.')[1] # 'last_ds'

			self.ch_ds.setdefault(ds_name, {}).update({ ds_attr: v })


	def _channel_info(self, flush_first=False):
		''' Calls the rrdtool.info on the channel RRD directly.  This will
			also flush the rrdcached and get most recent information.
		'''
		args = (self.rrd, "-d", rrdcached_address)

		if flush_first:
			args = args + ("-F", )

		result = None

		# Wrap the rrdtool call in try/except as something bad
		# may be going on with the RRD cache daemon.  We'll set
		# the channel error flag.
		try:
			result = rrtdool.info(*args)
		except:
			self.error = "Error reading channel information from {0}".format(rrdcached_address)

		return result



class Sensor:
	''' Sensor objects provide read-only values depending on sensor type '''

	def __init__(self, ch_id, ds_id, ds_values):
	
		self.channel_id = ch_id # track which channel we belong to for settings and data lookups

		# split ds_id into id, type, and unit (e.g., s0_VAC_Vrms)
		self.ds_id = ds_id
		split = ds_id.split('_')
		
		self.id = split[0]
		self.type = split[1]
		self.unit = split[2]
		
		self.value = float(ds_values['last_ds'])

		''' user-settable Sensor data stored in settings '''
		if not 'sensors' in settings['__channels'][ch_id]:
			chs = settings['__channels']
			chs[ch_id]['sensors'] = {}
			settings['__channels'] = chs

		if not self.id in settings['__channels'][ch_id]['sensors']:
			chs = settings['__channels']
			chs[ch_id]['sensors'][self.id] = {}
			settings['__channels'] = chs
			self.name = self.id

		# Add class properties to this instance to get __dict__ serialization
		self.__dict__['name'] = self.name


	@property
	def name(self):
		return settings['__channels'][self.channel_id]['sensors'][self.id]['name']

	@name.setter
	def name(self, value):
		chs = settings['__channels']
		chs[self.channel_id]['sensors'][self.id]['name'] = value
		settings['__channels'] = chs
		self.__dict__['name'] = value


class Control:
	''' Control objects provide read-write access to control state '''

	def __init__(self, ch_id, hw_control):
		
		self.channel_id = ch_id # track which channel we belong to for settings lookups

		self.id = hw_control['id'] # e.g., 'c0'

		''' user-settable Control data stored in settings '''
		if not 'controls' in settings['__channels'][ch_id]:
			chs = settings['__channels']
			chs[ch_id]['controls'] = {}
			settings['__channels'] = chs

		if not self.id in settings['__channels'][ch_id]['controls']:
			chs = settings['__channels']
			chs[ch_id]['controls'][self.id] = {}
			settings['__channels'] = chs
			self.name = self.id

		self.type = hw_control['type']
		self.state = hw_control['state']

		# Add class properties to this instance to get __dict__ serialization
		self.__dict__['name'] = self.name


	@property
	def name(self):
		return settings['__channels'][self.channel_id]['controls'][self.id]['name']

	@name.setter
	def name(self, value):
		chs = settings['__channels']
		chs[self.channel_id]['controls'][self.id]['name'] = value
		settings['__channels'] = chs

