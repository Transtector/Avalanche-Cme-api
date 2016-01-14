
from . import settings

class Sensor:
	''' Sensor objects provide read-only values depending on sensor type '''


	def __init__(self, ch_id, hw_sensor):
	
		self.channel_id = ch_id # track which channel we belong to for settings and data lookups

		self.id = hw_sensor['id'] # e.g., 's0'
		self.type = hw_sensor['type']
		self.unit = hw_sensor['unit']
		self.data = self.read(hw_sensor)

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

	def read(self, hw_sensor, expanded=False):

		if expanded:
			# TODO: return sensor data from file:
			# [  [ most_recent_timestamp, most_recent_value ], 
			#	 [            < points in between >         ],
			#    [ first_timestamp      , first_value       ]  ]
			return [ [ 1, 2 ], [ 3, 4] ]

		else:
			# [  [ most_recent_timestamp, most_recent_value ], 
			#    [ first_timestamp, first_value             ]  ]
			return hw_sensor['data'] 

