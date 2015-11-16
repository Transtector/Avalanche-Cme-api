#!./cme_venv/bin/python
from cme import app

import logging
from logging import handlers

import cherrypy
from paste.translogger import TransLogger

if __name__ == "__main__":

	# Make a new RotatingFileHandler for the CherryPy error (server) log.
	h = handlers.RotatingFileHandler(app.config['SERVERLOG'], 'a',
									 app.config['LOGBYTES'],
									 app.config['LOGCOUNT'])
	h.setLevel(logging.DEBUG)
	h.setFormatter(cherrypy._cplogging.logfmt)

	cherrypy.log.error_log.addHandler(h)
	cherrypy.log.screen = app.config['DEBUG']

	# Add an access logger for the Paste.TransLogger to use
	access_logger = logging.getLogger('access')
	h = handlers.RotatingFileHandler(app.config['ACCESSLOG'], 'a',
									 app.config['LOGBYTES'],
									 app.config['LOGCOUNT'])
	access_logger.setLevel(logging.INFO)
	access_logger.addHandler(h)

	# Put access requests on the screen too if DEBUG set, but use
	# a simpler format (the default access file format is the so
	# called Apache "combined log format" from Paste.TransLogger)
	# see: http://httpd.apache.org/docs/1.3/logs.html#combined
	if app.config['DEBUG']:
		h = logging.StreamHandler()
		h.setFormatter(logging.Formatter('%(message)s'))
		access_logger.addHandler(h)

	# Wrap our Cme (Flask) wsgi-app in the TransLogger and graft to CherryPy
	cherrypy.tree.graft(TransLogger(app, logger=access_logger), "/")

	# unsubscribe default server
	cherrypy.server.unsubscribe()

	# create new server
	http_server = cherrypy._cpserver.Server()

	# configure
	http_server.socket_host = app.config['SERVER_HOST']
	http_server.socket_port = app.config['SERVER_PORT']
	http_server.thread_pool = 30

	# subscribe to http
	http_server.subscribe()

	# for SSL support
	#https_server = cherrypy._cpserver.Server()
	#https_server.ssl_module = "pyopenssl"
	#https_server.ssl_certificate = "ssl/certificate.crt"
	#https_server.ssl_private_key = "ssl/private.key"
	#https_server.ssl_certificate_chain = "ssl/bundle.crt"

	#https_server.subscribe()

	# start the servers
	cherrypy.engine.start()
	cherrypy.engine.block()