import platform, os

def is_a_cme():
	''' Quick means to determine if we're on a cme device.  Many of
		the system calls within util will not work unless we're on
		the cme device platform.
	'''
	return platform.node().startswith('cme')

def is_a_docker():
	''' Check the ENV for the DOCKER flag.

	'''
	if os.environ.get('DOCKER'):
		return True

	return False

FIFO_IN = '/tmp/cmehostinput'
FIFO_OUT = '/tmp/cmehostoutput'

def docker_run(command):
	with open(FIFO_IN, 'w') as f:
		f.write(' '.join(command) + '\n')

	with open(FIFO_OUT, 'r') as f:
		result = f.read()

	return result.rstrip()