import platform, os

def is_a_cme():
	''' Quick means to determine if we're on a cme device.  Many of
		the system calls within util will not work unless we're on
		a valid cme device platform.
	'''
	return platform.node().startswith('cme')

def is_a_docker():
	''' Check for existence of /.dockerenv to see if we're inside a
		a docker conainer.
	'''
	return os.path.isfile('/.dockerenv'):

FIFO_IN = '/tmp/cmehostinput'
FIFO_OUT = '/tmp/cmehostoutput'

def docker_run(command):
	with open(FIFO_IN, 'w') as f:
		f.write(' '.join(command) + '\n')

	with open(FIFO_OUT, 'r') as f:
		result = f.read()

	return result.rstrip()