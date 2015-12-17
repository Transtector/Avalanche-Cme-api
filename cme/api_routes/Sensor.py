from time import time
import random

class Sensor:
	''' Sensor objects provide read-only values depending on sensor type '''

	# Units by sensor type
	UNITS = {
		'AC_VOLTAGE': 'Vrms',
		'AC_CURRENT': 'Arms',
		'DC_VOLTAGE': 'V',
		'DC_CURRENT': 'A'
	}

	__data = []

	def __init__(self, index, sensor_type):
		id = 's' + str(index)

		self.id = id
		self.type = sensor_type
		self.unit = self.UNITS[sensor_type]
		self.data = self.__data
		self.read()

	def read(self, expanded=False):
		ts = time()		

		if self.type == 'AC_VOLTAGE':
			value = random.randrange(1180, 1220) / 10

		else:
			value = random.randrange(2500, 5500) / 1000

		self.__data.append([ ts, value ])

		if (expanded):
			self.data = self.__data
		else:
			self.data = [ self.__data[0], self.__data[-1] ]

		return [ ts, value ]

