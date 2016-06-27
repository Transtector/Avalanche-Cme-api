
import logging, logging.handlers

import cherrypy
from . import Config

def Server_Logger():

	# Make a new RotatingFileHandler for the CherryPy error (server) log.
	h = logging.handlers.RotatingFileHandler(Config.SERVERLOG, 'a',
											 Config.LOGBYTES,
											 Config.LOGCOUNT)
	h.setLevel(logging.DEBUG)
	h.setFormatter(cherrypy._cplogging.logfmt)

	cherrypy.log.error_log.addHandler(h)
	cherrypy.log.screen = Config.DEBUG

	# Add an access logger for the Paste.TransLogger to use
	access_logger = logging.getLogger('access')
	h = logging.handlers.RotatingFileHandler(Config.ACCESSLOG, 'a',
									 Config.LOGBYTES,
									 Config.LOGCOUNT)
	access_logger.setLevel(logging.INFO)
	access_logger.addHandler(h)

	# Put access requests on the screen too if DEBUG set, but use
	# a simpler format (the default access file format is the so
	# called Apache "combined log format" from Paste.TransLogger)
	# see: http://httpd.apache.org/docs/1.3/logs.html#combined
	if Config.DEBUG:
		h = logging.StreamHandler()
		h.setFormatter(logging.Formatter('%(message)s'))
		access_logger.addHandler(h)

	return access_logger

def App_Logger(logger):

	# by default logs to screen only if DEBUG set
	formatter = logging.Formatter('%(asctime)s %(levelname)-8s [%(name)s] %(message)s',
								   datefmt='%Y-%m-%d %H:%M:%S')

	# set format in default Flask logging StreamHandler for console (DEBUG) output
	for h in logger.handlers:
		h.setFormatter(formatter)

	# always send app log to file
	fh = logging.handlers.RotatingFileHandler(Config.APPLOG,
										  maxBytes=Config.LOGBYTES,
										  backupCount=Config.LOGCOUNT)
	# increase level if DEBUG set
	if Config.DEBUG:
		fh.setLevel(logging.DEBUG)
	else:
		fh.setLevel(logging.INFO)

	# use same formatting for file
	fh.setFormatter(formatter)
	logger.addHandler(fh)

	return logger