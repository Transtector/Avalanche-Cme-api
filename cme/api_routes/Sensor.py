
from . import settings

class Sensor:
	''' Sensor objects provide read-only values depending on sensor type '''


	def __init__(self, ch_id, hw_sensor, loadHistory=False):
	
		self.channel_id = ch_id # track which channel we belong to for settings and data lookups

		self.id = hw_sensor['id'] # e.g., 's0'
		self.type = hw_sensor['type']
		self.unit = hw_sensor['unit']
		self.data = self._loadHistory() if loadHistory else hw_sensor['data']

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

	def _loadHistory(self):
		return []
