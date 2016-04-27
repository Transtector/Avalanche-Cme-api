import os

from . import app, router, request, send_from_directory, json_response, json_error, require_auth

@router.route('/logs/', methods=['GET'])
@router.route('/logs/<filename>')
@require_auth
def logs(filename=None):
	''' Returns the requested log file and optionally clears it.

		If request made without parameters, just returns a list of
		the log files available as list of { filename, size }.

		Query

	'''
	logdir = app.config['LOGDIR']

	# return the list of logs available if no name requested
	if not filename:

		logs = [] # array of { filename, file size }

		for f in os.listdir(logdir):
			path = os.path.join(logdir, f)

			if os.path.isfile(path):
				logs.append({ f: os.path.getsize(path) })

		return json_response({ "logs": logs })

	# see if requested log is available
	path = os.path.join(logdir, filename)
	content = ''

	if os.path.isfile(path):
		return send_from_directory(logdir, filename, mimetype='text/plain')


	return json_response({"logs": "you don't want logs!"})
