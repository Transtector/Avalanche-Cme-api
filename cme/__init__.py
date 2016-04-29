import os
import logging, logging.handlers

from flask import Flask, g
app_name = __name__.split('.')[0]
app = Flask(app_name, static_url_path='')

# set up for deferred requests
def after_this_request(f):
	if not hasattr(g, 'after_request_callbacks'):
		g.after_request_callbacks = []
	g.after_request_callbacks.append(f)
	return f

# register the after request callbacks
@app.after_request
def call_after_request_callbacks(response):
	for callback in getattr(g, 'after_request_callbacks', ()):
		callback(response)
	return response

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
logger.info("\tHOSTNAME:\t{0}".format(app.config['HOSTNAME']))
logger.info("\tPLATFORM:\t{0}".format(app.config['SYSTEM']))
logger.info("\tSERVER_IP:\t{0}".format(app.config['ADDRESS']))
logger.info("\tSERVER_PORT:\t{0}".format(app.config['SERVER_PORT']))
logger.info("\tDEBUG:\t\t{0}".format(app.config['DEBUG']))
logger.info("\tDOCROOT:\t{0}".format(app.config['DOCROOT']))
logger.info("\tPUBLIC:\t\t{0}".format(app.static_folder))
logger.info("\tUPLOADS:\t{0}".format(app.config['UPLOADS']))


# log network status
from .util.IpUtils import manage_network
manage_network(settings['network'])

# log ntp/clock status
from .util.ClockUtils import manage_clock
manage_clock(settings['clock'])

# function decorator for routes that require authorization (i.e., login)
from .util.Auth import require_auth, Serializer

# function to parse URI's easily
from .util.UriParse import path_parse

# import ui, api routes
from . import ui_routes as ui
from . import api_routes as api

# register route blueprints
app.register_blueprint(ui.router)
app.register_blueprint(api.router, url_prefix='/api')

# main entry only for dev_mode Flask built-in server
# > sudo python -m cme
def main():
	logger.debug("\t============================\n\tDEVELOPMENT MODE\n\t============================\n")

	app.run(host=app.config['SERVER_HOST'],
			port=app.config['SERVER_PORT'],
			debug=app.config['DEBUG'],
			use_reloader=False)
