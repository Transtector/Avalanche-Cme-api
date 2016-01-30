import os, json
from . import settings
from cme import app

LOGDIR = app.config['LOGDIR']

from .Control import Control
from .Sensor import Sensor

class Channel:
	
	def __init__(self, hw_ch, expand=False): 

		self.id = hw_ch['id'] # e.g., 'ch0'

		self.__dict__['error'] = hw_ch['error']

		''' user-settable channel settings are cached in settings['__channels'] by channel id '''
		if not self.id in settings['__channels']:
			chs = settings['__channels']
			chs[self.id] = {}
			settings['__channels'] = chs

			self.name = self.id
			self.description = self.id + ' description'

		self.sensors = []
		self.controls = []

		# Add class properties to this instance to get __dict__ serialization
		self.__dict__['name'] = self.name
		self.__dict__['description'] = self.description

		# Add channel sensors...
		if 'sensors' in hw_ch:

			# load channel data from file if requested
			if expand:
				logfile = os.path.abspath(os.path.join(LOGDIR, hw_ch['id'] + '_sensors.json'))
				data = self._loadHistory(logfile)

			for i, s in enumerate(hw_ch['sensors']):
				if expand:
					s['data'] = data[i]

				self.sensors.append(Sensor(hw_ch['id'], s))

		# Add channel controls...
		if 'controls' in hw_ch:
			for c in hw_ch['controls']:
				self.controls.append(Control(hw_ch['id'], c))

	@property
	def name(self):
		return settings['__channels'][self.id]['name']

	@name.setter
	def name(self, value):
		chs = settings['__channels']
		chs[self.id]['name'] = value
		settings['__channels'] = chs

	@property
	def description(self):
		return settings['__channels'][self.id]['description']
	
	@description.setter
	def description(self, value):
		chs = settings['__channels']
		chs[self.id]['description'] = value
		settings['__channels'] = chs

	def _loadHistory(self, filename):
		''' Loads and decimates the history of data points within filename '''
		
		with open(filename, 'r') as f:
			lines = f.readlines()

		MAX_SIZE = 201 # just return 201 points for display
		decimate = len(lines) > MAX_SIZE

		if decimate:
			bucket_size = (len(lines) - 2) // (MAX_SIZE - 2) # floor quotient
			data_size = MAX_SIZE
		else:
			bucket_size = 1
			data_size = len(lines)

		#print("\nLoading {0} history".format(self.id))
		#print("    History length: {0}".format(len(lines)))
		#print("    Decimate: {0}".format(decimate))
		#print("    Bucket size: {0}".format(bucket_size))

		data = []

		# first points
		points = json.loads(lines[0])
		for i in range(1, len(points)):
			data.append([ [ points[0], points[i] ] ])

		# points in between may get decimated into bins of 'bucket_size' where max values are chosen
		for i in range(1, data_size - 1):
			r = (i - 1) * bucket_size + 1
			bucket = []

			for line in lines[r:r+bucket_size]:
				points = json.loads(line)

				#print("    Bucket {0} from lines[{1}:{2}] = {3}".format(i, r, r+bucket_size, points))

				if len(bucket) == 0:
					for j in range(1, len(points)):
						bucket.append([ points[0], points[j] ])

				if decimate:
					for j in range(1, len(points)):
						if bucket[j-1][1] < points[j]:
							bucket[j-1] = [ points[0], points[j] ]

			#print("    Bucket full: {0}".format(bucket))
			for j, point in enumerate(bucket):
				data[j].append(point)

		# last points
		points = json.loads(lines[-1])
		for i in range(1, len(points)):
			data[i-1].append([ points[0], points[i] ])


		#print("\n    Number of Sensors: {0}".format(len(data)))
		#for i, sensors in enumerate(data):
		#	print("\n    Sensor {0}".format(i))
		#	for points in sensors:
		#		print("        [{0}, {1}]".format(points[0], points[1]))
		#	print("    ----")

		return data
