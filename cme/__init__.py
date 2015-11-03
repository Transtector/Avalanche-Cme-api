import os
from flask import Flask
app_name = __name__.split('.')[0]
app = Flask(app_name, static_url_path='')

from .util.IpUtils import mac, dhcp, address, netmask, gateway

# load application configuration from module
app.config.from_object('config')

# load settings which may override values in config
from settings import settings

# say something nice at startup
print()
print("Avalanche ({0}) is rumbling...".format(app_name))
print()
print("\tHOSTNAME: {0}".format(app.config['HOSTNAME']))
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
print("\tMAC: {0}".format(settings['network']['mac']))
print("\tDHCP: {0}".format(settings['network']['dhcp']))
print()

# NTP init
# Note that ntp should NOT be setup in init.d to start automatically:
# > sudo update-rc.d -f ntp remove
if settings['time']['useNTP'] and app.config['IS_CME']:
	os.system('sudo service ntp start')

# Network init
# TODO: set up a backup static address in /etc/dhcp/dhclient.conf
# Check if current net settings match settings and write/reset network stack if not
print("\n\t======== NETWORK INIT ==========\n")
print("\t\t Current \t\t\t Settings ")
print("\t\t---------\t\t\t----------")
print("\tDHCP:\t{0} \t\t\t\t{1}".format(dhcp(), settings['network']['dhcp']))
print("\tIP:\t{0} \t\t\t{1}".format(address(), settings['network']['address']))
print("\tMASK:\t{0} \t\t\t\t{1}".format(netmask(), settings['network']['netmask']))
print("\tGATE:\t{0} \t\t\t{1}".format(gateway(), settings['network']['gateway']))

if dhcp() != settings['network']['dhcp'] or \
   address() != settings['network']['address'] or \
   netmask() != settings['network']['netmask'] or \
   gateway() != settings['network']['gateway']:
   print("\n\tNetwork MISMATCH!\n\n")


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
