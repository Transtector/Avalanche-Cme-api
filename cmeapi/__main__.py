# cme application main entry
import os, sys, getopt, rrdtool

# CherryPy is the wsgi application server
# and we use the TransLogger from Paste to
# reformat the Flask (wsgi application) logs
import cherrypy
from paste.translogger import TransLogger

# cme configuration file
from .common import Config, Logging
settings = Config.USER_SETTINGS

# Flask is the wsgi application that sits
# behind the CherryPy server
from . import app
app.config.from_object(Config.FLASK)

# Set up access and api logging
#from .Logging import Access_Logger, Api_Logger
# set up the api layer logging
#api_logger = Api_Logger(app.logger_name, Config)
API_LOGGER=None

def main(argv=None):

	# Set up API logging - use Flask app logger since it's at the root
	CONSOLE_LOGGING = False

	global API_LOGGER
	API_LOGGER = Logging.GetLogger(app.logger_name, {
		'REMOVE_PREVIOUS': False,
		'PATH': os.path.join(Config.PATHS.LOGDIR, 'cme-api.log'),
		'SIZE': (1024 * 10),
		'COUNT': 1,
		'FORMAT': '%(asctime)s %(levelname)-8s [%(name)s] %(message)s',
		'DATE': '%Y-%m-%d %H:%M:%S',
		'LEVEL': 'DEBUG',
		'CONSOLE': CONSOLE_LOGGING
	})

	# CherryPy for logging requests - don't supply formatting
	# this is handled by the Paste Translogger.
	ACCESS_LOGGER = Logging.GetLogger('access', {
		'REMOVE_PREVIOUS': False,
		'PATH': os.path.join(Config.PATHS.LOGDIR, 'access.log'),
		'SIZE': (1024 * 1024 * 10),
		'COUNT': 2,
		'LEVEL': 'INFO',
		'CONSOLE': CONSOLE_LOGGING
	})

	# CherryPy for logging server errors (e.g., status=500)
	SERVER_LOGGER = Logging.GetLogger('server', {
		'REMOVE_PREVIOUS': False,
		'PATH': os.path.join(Config.PATHS.LOGDIR, 'server.log'),
		'SIZE': (1024 * 10),
		'COUNT': 1,
		'FORMAT': cherrypy._cplogging.logfmt,
		'LEVEL': 'ERROR',
		'CONSOLE': False # CherryPy screen logging handled in call below
	})


	# parse command-line options

	# network and ntp/clock status
	from .common.IpUtils import manage_network
	from .common.ClockUtils import manage_clock

	# api routes
	from . import api_routes

	# register route blueprints
	app.register_blueprint(api_routes.router)
	
	API_LOGGER.info("Avalanche (Cme-api) is rumbling...")

	API_LOGGER.info("\tRECOVERY:\t{0}".format('YES' if Config.RECOVERY.RECOVERY_MODE else 'NO'))
	API_LOGGER.info("\tVERSION:\t{0}".format(Config.INFO.VERSION))
	API_LOGGER.info("\tDEBUG:\t\t{0}".format(Config.INFO.DEBUG))
	API_LOGGER.info("\tHOSTNAME:\t{0}".format(Config.INFO.HOSTNAME))
	API_LOGGER.info("\tSERVER_PORT:\t{0}".format(Config.API.SERVER_PORT))
	API_LOGGER.info("\tPLATFORM:\t{0}".format(Config.INFO.SYSTEM))

	API_LOGGER.info("Files and Storage")

	API_LOGGER.info("\tAPIROOT:\t{0}".format(Config.PATHS.APPROOT))
	API_LOGGER.info("\tLOGDIR: \t{0}".format(Config.PATHS.LOGDIR))
	API_LOGGER.info("\tWEBROOT:\t\t{0}".format(Config.PATHS.WEB_ROOT))
	API_LOGGER.info("\tUPLOADS:\t{0}".format(Config.PATHS.UPLOADS))
	API_LOGGER.info("\tRRDCACHED:\t{0}".format(Config.RRD.RRDCACHED))

	# setup network and clock - these will log messages
	manage_network(settings)	
	manage_clock(settings)

	# Some global Cherry py settings
	cherrypy.config.update({'engine.autoreload.on': False, 'log.screen': CONSOLE_LOGGING })
	cherrypy.log.error_log.addHandler(SERVER_LOGGER.handlers[0])

	# Serve static content;  If we're running in RECOVERY MODE, the 
	# web application is served from normal file system else it gets mounted
	# from the cme-web docker image and shared at the same location.
	cherrypy.tree.mount(None, '/', {'/' : {
		'tools.staticdir.dir': Config.PATHS.WEB_ROOT,
		'tools.staticdir.on': True,
		'tools.staticdir.index': 'index.html',
		'tools.staticfile.filename': 'favicon.ico'
	}})

	# Wrap our Cme (Flask) wsgi-app in the TransLogger and graft to CherryPy
	cherrypy.tree.graft(TransLogger(app, logger=ACCESS_LOGGER), '/api')

	# unsubscribe default server
	cherrypy.server.unsubscribe()

	# create new server
	http_server = cherrypy._cpserver.Server()

	# configure
	http_server.socket_host = Config.API.SERVER_HOST
	http_server.socket_port = Config.API.SERVER_PORT
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
		API_LOGGER.info("Avalanche (Cme-api) shutdown requested ... exiting")

	except Exception as e:
		API_LOGGER.info("Avalanche (Cme-api) has STOPPED on exception {0}".format(e))
		raise
