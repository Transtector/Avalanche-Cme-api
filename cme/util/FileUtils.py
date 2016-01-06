import os, time
from .. import app, settings

# check for firmware update file presence
def refresh_device():
	''' Check uploads folder for any contents.  There should only
		be at most a single file which will be used if an update
		is triggered.'''

	files = [fn for fn in os.listdir(app.config['UPLOADS'])
			if any(fn.endswith(ext) for ext in app.config['ALLOWED_EXTENSIONS'])]

	# choose the first one, if any
	settings['__device']['__update'] = '' if len(files) == 0 else files[0]



def delay_factory_reset(delay=5):
	
	# create/touch the reset file
	# from: http://stackoverflow.com/a/6222692/1169898
	resetFile = app.config['RESET']

	try:
		os.utime(resetFile, None)
	except:
		open(resetFile, 'a').close()

	print("Factory reset and restart in {0} seconds...".format(delay))
	time.sleep(delay)

	if app.config['IS_CME']:
		os.system("shutdown -r now")
	
