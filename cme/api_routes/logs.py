import os, glob
import tempfile

from . import router, request, send_from_directory, send_file, json_response, json_error, require_auth
from .. import Config

def bool_arg(name, request):
	''' Convert query string arguments to boolean values.

		If key is present in the request args dict and is
		any of the string in the match array, returns True
		otherwise False.
	'''
	key = request.args.get(name)
	return str(key).lower() in [ '1', 'true', 't', 'yes', 'y' ]

@router.route('/logs/', methods=['GET'])
@router.route('/logs/<filename>')
@require_auth
def logs(filename=None):
	''' Returns the requested log file and optionally clears it.

		If request made without parameters, just returns a list of
		the log files available as list of { filename, size }.

		query string parameters:
			download (bool) - download identified log file (as opposed to stream content)
			clear (bool) - clear the identified log file (content returned before clear)
	'''
	logdir = Config.LOGDIR

	if not filename:
		# return the list of logs available if no name requested
	
		logs = [] # array of { filename, file size }

		for f in glob.glob(os.path.join(logdir, '*.log*' )):
			path = os.path.join(logdir, f)

			if os.path.isfile(path):
				logs.append({ os.path.basename(f): os.path.getsize(path) })

		return json_response({ "logs": logs })

	# see if requested log is available
	path = os.path.join(logdir, filename)

	if os.path.isfile(path) and path in glob.glob(os.path.join(logdir, '*.log*')):
		# check that file exists and matches the log file globbing pattern
		# then check the query params for processing options

		download = bool_arg('download', request)
		clear = bool_arg('clear', request)

		# if clearing, use a temporary file to return current log
		if clear:
			f = tempfile.NamedTemporaryFile(mode="w+")
			f.writelines([l for l in open(path).readlines()])
			f.seek(0)
			response = send_file(f, mimetype='text/plain', as_attachment=download, attachment_filename=filename)
			f.seek(0, os.SEEK_END)
			size = f.tell()
			f.seek(0)

			# If we're clearing a rotated log file, it's name will
			# end in a number (e.g., "cme.log.1, cme.log.2, ...").
			# We'll delete those file completely, else we'll just
			# clear the file content.
			if os.path.splitext(path)[1] == '.log':
				# clear log content 
				open(path, "w").close()

			else:
				# delete log file
				os.remove(path)

			response.headers.extend({
				'Content-Length': size
			})

		else:
			# set response header to indicate file download
			response = send_from_directory(logdir, filename, mimetype='text/plain', 
				attachment_filename=filename, as_attachment=download)

		response.headers.extend({
			'Cache-Control': 'no-cache'
		})

		return response

	return json_error('Invalid log file request', code=404)
