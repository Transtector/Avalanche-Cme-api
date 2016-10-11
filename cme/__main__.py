# cme application main entry
import sys

# CherryPy is the wsgi application server
# and we use the TransLogger from Paste to
# reformat the Flask (wsgi application) logs
import cherrypy
from paste.translogger import TransLogger

# Flask is the wsgi application that sits
# behind the CherryPy server
from flask import Flask

# Set up server and application logging
from .Logging import Server_Logger, App_Logger

# cme configuration file
from . import Config

# load settings which may override the user-settable
# CME configuration values
from .Settings import settings

# network and ntp/clock status
from .util.IpUtils import manage_network
from .util.ClockUtils import manage_clock

# import ui, api routes
from . import ui_routes
from . import api_routes

def main(args=None):

	if args is None:
		args = sys.argv[1:]

	server_logger = Server_Logger()

	# initialize the Flask application
	app = Flask('cme', static_url_path='')
	app.config.from_object('cme.Config')

	# set up the application layer logging
	app_logger = App_Logger(app.logger)

	# log the network and clock states at init
	manage_network(settings['network'])
	manage_clock(settings['clock'])

	# register route blueprints
	app.register_blueprint(ui_routes.router)
	app.register_blueprint(api_routes.router, url_prefix='/api')
	
	app_logger.info("Avalanche (Cme) is rumbling...")
	app_logger.info("\tHOSTNAME:\t{0}".format(Config.HOSTNAME))
	app_logger.info("\tPLATFORM:\t{0}".format(Config.SYSTEM))
	app_logger.info("\tSERVER_IP:\t{0}".format(Config.ADDRESS))
	app_logger.info("\tSERVER_PORT:\t{0}".format(Config.SERVER_PORT))
	app_logger.info("\tDEBUG:\t\t{0}".format(Config.DEBUG))

	app_logger.info("\tAPPROOT:\t{0}".format(app.root_path))
	app_logger.info("\tSTATIC:\t\t{0}".format(app.static_folder))
	app_logger.info("\tTEMPLATE:\t\t{0}".format(app.template_folder))

	app_logger.info("\tUPLOADS:\t{0}".format(Config.UPLOAD_FOLDER))

	# Wrap our Cme (Flask) wsgi-app in the TransLogger and graft to CherryPy
	cherrypy.tree.graft(TransLogger(app, logger=server_logger), "/")

	# unsubscribe default server
	cherrypy.server.unsubscribe()

	# create new server
	http_server = cherrypy._cpserver.Server()

	# configure
	http_server.socket_host = Config.SERVER_HOST
	http_server.socket_port = Config.SERVER_PORT
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

if __name__ == "__main__":
	main()