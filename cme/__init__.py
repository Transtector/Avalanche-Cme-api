import os
from flask import Flask
app_name = __name__.split('.')[0]
app = Flask(app_name, static_url_path='')

# load application configuration from module
app.config.from_object('config')

# load settings which may override values in config
from settings import settings

# say something nice at startup
print()
print("Avalanche ({0}) is rumbling...".format(app_name))
print()
print("\tPLATFORM: {0}".format(app.config['SYSTEM']))
print("\tSERVER_HOST: {0}".format(app.config['SERVER_HOST']))
print("\tSERVER_PORT: {0}".format(app.config['SERVER_PORT']))
print("\tDEBUG: {0}".format(app.config['DEBUG']))
print("\tDOCROOT: {0}".format(app.config['DOCROOT']))
print("\tPUBLIC: {0}".format(app.static_folder))
print("\tUPLOADS: {0}".format(app.config['UPLOADS']))
print("\t--------")
print("\tNTP: {0}".format(settings['time']['useNTP']))
print("\t--------")
print("\tMAC: {0}".format(settings['network']['MAC']))
print()

# NTP init
# Note that ntp should NOT be setup in init.d to start automatically:
# > sudo update-rc.d -f ntp remove
if settings['time']['useNTP'] and app.config['IS_CME']:
	os.system('sudo service ntp start')
else:
	if app.config['IS_CME']:
		os.system('sudo service ntp stop')

# Network init


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
