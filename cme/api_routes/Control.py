
from . import settings

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

