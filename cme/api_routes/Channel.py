from . import settings

from .Control import Control
from .Sensor import Sensor

class Channel:
	
	def __init__(self, hw_ch): 

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
			for s in hw_ch['sensors']:
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
