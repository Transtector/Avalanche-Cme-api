

class Sensor:
	''' Sensor objects provide read-only values depending on sensor type '''


	def __init__(self, ch_id, hw_sensor):
	
		self.channel_id = ch_id # track which channel we belong to for settings and data lookups

		self.id = hw_sensor['id'] # e.g., 's0'
		self.type = hw_sensor['type']
		self.unit = hw_sensor['unit']
		self.data = self.read(hw_sensor)

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

