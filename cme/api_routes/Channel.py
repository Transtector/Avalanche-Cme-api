from .Control import Control
from .Sensor import Sensor

class Channel:
	''' Channel - includes sensors and controls '''

	def __init__(self, index): 
		id = 'ch' + str(index)

		self.id = id
		self.name = id
		self.description = 'channel ' + str(index) + ' description'
		self.controls = [
			Control(0, "Circuit switch", "SPST_RELAY", True)
		]
		self.sensors = [
			Sensor(0, "AC_VOLTAGE"),
			Sensor(1, "AC_CURRENT")
		]

	def update(self):
		for s in self.sensors:
			s.read()

