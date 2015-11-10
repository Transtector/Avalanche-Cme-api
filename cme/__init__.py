import os
from flask import Flask
app_name = __name__.split('.')[0]
app = Flask(app_name, static_url_path='')

from .util.TimeUtils import manage_time
from .util.IpUtils import manage_network

# load application configuration from module
app.config.from_object('config')

# load settings which may override values in config
from settings import settings

# say something nice at startup
print()
print("Avalanche ({0}) is rumbling...".format(app_name))
print()
print("\tHOSTNAME:\t{0}".format(app.config['HOSTNAME']))
print("\tPLATFORM:\t{0}".format(app.config['SYSTEM']))
print("\tSERVER_HOST:\t{0}".format(app.config['SERVER_HOST']))
print("\tSERVER_PORT:\t{0}".format(app.config['SERVER_PORT']))
print("\tDEBUG:\t\t{0}".format(app.config['DEBUG']))
print("\tDOCROOT:\t{0}".format(app.config['DOCROOT']))
print("\tPUBLIC:\t\t{0}".format(app.static_folder))
print("\tUPLOADS:\t{0}".format(app.config['UPLOADS']))

if app.config['IS_CME']:
	manage_time(settings['time'])

# Network init
if app.config['IS_CME']:
	manage_network(settings['network'])

print()

# import ui, api routes
from .ui_routes import index
import cme.api_routes as api

# register route blueprints
app.register_blueprint(index.router)
app.register_blueprint(api.router, url_prefix='/api')

# main entry only for dev_mode Flask built-in server
# > sudo python -m cme
def main():
	print("\t============================\n\tDEVELOPMENT MODE\n\t============================\n")

	app.run(host=app.config['SERVER_HOST'],
			port=app.config['SERVER_PORT'],
			debug=app.config['DEBUG'],
			use_reloader=False)
