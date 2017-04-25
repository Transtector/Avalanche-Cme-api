
import logging, logging.handlers

def Access_Logger(Config):

	# Make a new RotatingFileHandler for the CherryPy error (server) log.
	#h = logging.handlers.RotatingFileHandler(Config.LOGGING.SERVERLOG, 'a',
	#										 Config.LOGGING.LOGBYTES,
	#										 Config.LOGGING.LOGCOUNT)
	#h.setLevel(logging.DEBUG)
	#h.setFormatter(cherrypy._cplogging.logfmt)
	#cherrypy.log.error_log.addHandler(h)

	# Add an access logger for the Paste.TransLogger to use
	# Append to existing logs and rotate at 10 MB with up to 2 saved logs
	h = logging.handlers.RotatingFileHandler(Config.LOGGING.ACCESSLOG, 'a',
									 10 * 1024 * 1024,
									 2)

	access_logger = logging.getLogger('access')
	access_logger.setLevel(logging.INFO)
	access_logger.addHandler(h)

	# Put access requests on the screen too if DEBUG set, but use
	# a simpler format (the default access file format is the so
	# called Apache "combined log format" from Paste.TransLogger)
	# see: http://httpd.apache.org/docs/1.3/logs.html#combined
	if Config.INFO.DEBUG:
		h = logging.StreamHandler()
		h.setFormatter(logging.Formatter('%(message)s'))
		access_logger.addHandler(h)

	return access_logger

def Api_Logger(Config):

	# get Flask application logger (see __init__.py)
	api_logger = logging.getLogger('cme-api')

	# by default logs to screen only if DEBUG set
	formatter = logging.Formatter('%(asctime)s %(levelname)-8s [%(name)s] %(message)s',
								   datefmt='%Y-%m-%d %H:%M:%S')

	# set format in default Flask logging StreamHandler for console (DEBUG) output
	for h in api_logger.handlers:
		h.setFormatter(formatter)

	# always send api log to file, but reset file after restarts
	fh = logging.handlers.RotatingFileHandler(Config.LOGGING.APILOG, 
											mode='w',
											maxBytes=10 * 1024,
											backupCount=1)
	# increase level if DEBUG set
	if Config.INFO.DEBUG:
		fh.setLevel(logging.DEBUG)
	else:
		fh.setLevel(logging.INFO)

	# use same formatting for file
	fh.setFormatter(formatter)

	api_logger.addHandler(fh)

	return api_logger


