import platform

def is_a_cme():
	''' Quick means to determine if we're on a cme device.  Many of
		the system calls within util will not work unless we're on
		the cme device platform.
	'''
	return platform.node().startswith('cme')