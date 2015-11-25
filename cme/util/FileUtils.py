import os
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


