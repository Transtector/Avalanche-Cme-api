from time import time

class Control:
	''' Control objects provide read-write access to control state '''

	__data = []

	def __init__(self, index, name, control_type, state):
		id = 'c' + str(index)

		self.id = id
		self.name = name
		self.type = control_type
		self.data = self.__data
		self.set(state)

	def set(self, state):
		ts = time()
		self.__data.append([ ts, state ])
		self.data = [ self.__data[0], self.__data[-1] ]
