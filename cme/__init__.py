import os
import logging
import logging.handlers

from flask import Flask
app_name = __name__.split('.')[0]
app = Flask(app_name, static_url_path='')

from .util.TimeUtils import manage_time
from .util.IpUtils import manage_network

# load application configuration from module
app.config.from_object('config')

# configure app logging - use the Flask app.logger
# by default logs to screen only if DEBUG set
logger = app.logger
formatter = logging.Formatter('%(asctime)s %(levelname)-8s [%(name)s] %(message)s',
							   datefmt='%Y-%m-%d %H:%M:%S')

# set format in default Flask logging StreamHandler for console (DEBUG) output
for h in logger.handlers:
	h.setFormatter(formatter)

# always send app log to file
fh = logging.handlers.RotatingFileHandler(app.config['APPLOG'],
										  maxBytes=app.config['LOGBYTES'],
										  backupCount=app.config['LOGCOUNT'])
# increase level if DEBUG set
if app.config['DEBUG']:
	fh.setLevel(logging.DEBUG)
else:
	fh.setLevel(logging.INFO)

# use same formatting for file
fh.setFormatter(formatter)
logger.addHandler(fh)

# load settings which may override values in config
from settings import settings

# say something nice at startup
logger.info("Avalanche ({0}) is rumbling...".format(app_name))
logger.debug("\tHOSTNAME:\t{0}".format(app.config['HOSTNAME']))
logger.debug("\tPLATFORM:\t{0}".format(app.config['SYSTEM']))
logger.debug("\tSERVER_HOST:\t{0}".format(app.config['SERVER_HOST']))
logger.debug("\tSERVER_PORT:\t{0}".format(app.config['SERVER_PORT']))
logger.debug("\tDEBUG:\t\t{0}".format(app.config['DEBUG']))
logger.debug("\tDOCROOT:\t{0}".format(app.config['DOCROOT']))
logger.debug("\tPUBLIC:\t\t{0}".format(app.static_folder))
logger.debug("\tUPLOADS:\t{0}".format(app.config['UPLOADS']))

if app.config['IS_CME']:
	manage_time(settings['time'])

# Network init
if app.config['IS_CME']:
	manage_network(settings['network'])

# import ui, api routes
from .ui_routes import index
import cme.api_routes as api

# register route blueprints
app.register_blueprint(index.router)
app.register_blueprint(api.router, url_prefix='/api')

# main entry only for dev_mode Flask built-in server
# > sudo python -m cme
def main():
	logger.debug("\t============================\n\tDEVELOPMENT MODE\n\t============================\n")

	app.run(host=app.config['SERVER_HOST'],
			port=app.config['SERVER_PORT'],
			debug=app.config['DEBUG'],
			use_reloader=False)
