# cme application main entry
import sys, getopt, rrdtool

# CherryPy is the wsgi application server
# and we use the TransLogger from Paste to
# reformat the Flask (wsgi application) logs
import cherrypy
from paste.translogger import TransLogger

# Set up server and application logging
from .Logging import Server_Logger, App_Logger

# cme configuration file
from . import Config

# load settings which may override the user-settable
# CME configuration values
from .Settings import settings

from . import  app
app.config.from_object(Config)

# set up the application layer logging
app_logger = App_Logger(app.logger)
server_logger = Server_Logger()

def main(argv=None):

	# parse command-line options
	if argv is None:
		argv = sys.argv[1:]

	try:
		opts, args = getopt.getopt(argv, "", ["rrdcached="])
	except getopt.GetoptError:
		print("Invalid command line arguments are ignored")
		opts = []
		args = []

	for opt, arg in opts:
		# override the Config.RRDCACHED
		if opt == '--rrdcached':
			Config.RRDCACHED = arg


	# Now that RRDCACHED is set up, try to read the "test.rrd" channel
	# If no problems, then things are fine and we can move on.  If not,
	# we still want to allow the cme layer to run, so we set the address
	# to flag it to downstream code so they may bypass rrdcached calls.
	if Config.RRDCACHED:
		try:
			rrdtool.info('test.rrd', '-d', Config.RRDCACHED)
		except rrdtool.OperationalError:
			Config.RRDCACHED = 'FAILED'


	# network and ntp/clock status
	from .util.IpUtils import manage_network
	from .util.ClockUtils import manage_clock

	# import ui, api routes
	from . import ui_routes
	from . import api_routes

	# register route blueprints
	app.register_blueprint(ui_routes.router)
	app.register_blueprint(api_routes.router, url_prefix='/api')
	
	app_logger.info("Avalanche (Cme) is rumbling...")
	app_logger.info("\tRECOVERY:\t{0}".format('YES' if Config.RECOVERY else 'NO'))
	app_logger.info("\tVERSION:\t{0}".format(Config.VERSION))
	app_logger.info("\tDEBUG:\t\t{0}".format(Config.DEBUG))
	app_logger.info("\tHOSTNAME:\t{0}".format(Config.HOSTNAME))
	app_logger.info("\tPLATFORM:\t{0}".format(Config.SYSTEM))

	manage_network(settings['network'])	
	app_logger.info("\tSERVER_PORT:\t{0}".format(Config.SERVER_PORT))

	manage_clock(settings['clock'])

	app_logger.info("Files and Storage")
	app_logger.info("\tAPPROOT:\t{0}".format(app.root_path))
	app_logger.info("\tSTATIC:\t\t{0}".format(app.static_folder))
	app_logger.info("\tTEMPLATE:\t\t{0}".format(app.template_folder))
	app_logger.info("\tUPLOADS:\t{0}".format(Config.UPLOAD_FOLDER))
	app_logger.info("\tRRDCACHED:\t{0}".format(Config.RRDCACHED))



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
	
	try:
		main()

	except KeyboardInterrupt:
		app_logger.info("Avalanche (Cme) shutdown requested ... exiting")

	except Exception as e:
		app_logger.info("Avalanche (Cme) has STOPPED on exception {0}".format(e))

		# re-raise to print stack trace here (useful for debugging the problem)
		raise

	sys.exit(0)

