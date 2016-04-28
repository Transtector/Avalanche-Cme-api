# CME device and configuration API route handlers

import os, time, threading, logging

from . import (app, router, settings, request, json_response, 
	json_error, json_filter, require_auth, refresh_device)
from ..util.IpUtils import set_dhcp, write_network_addresses
from ..util.ClockUtils import refresh_time, ntp_servers


# top-level configuration
@router.route('/config/', methods=['GET', 'POST'])
@require_auth
def config():
	if request.method == 'POST':
		return json_error([ 'Not implemented' ])

	refresh_device()
	refresh_time(settings['clock'])

	return json_response({ 'config': json_filter(settings.items()) })


@router.route('/config/reset', methods=['GET'])
@require_auth
def reset():

	reset_network = request.args.get('reset_network')
	reset_clock = request.args.get('reset_clock')
	
	# Factory reset deletes the settings.json file and performs a 
	# reboot.
	t = threading.Thread(target=__reset, args=(5, reset_network, reset_clock, ))
	t.setDaemon(True)
	t.start()

	# Return nothing (but status = 200) to let 'em know we're resetting
	return json_response(None)


def __reset(delay=5, reset_network=False, reset_clock=False):
	''' Performs the factory reset with optional network and clock (ntp) configuration reset.

		Basic reset simply removes the current user settings (typically found in /data/settings.json,
		but look at app.config['SETTINGS'] key to see where it might be).

		Network reset:
			1) Turn off DHCP network config
			1) Write default static addresses
			-- Network will reset to defaults after reboot

		NTP reset:
			1) Write default NTP servers
			2) Enable the ntp service
			-- NTP will reset to defaults after reboot

	'''
	try:
		os.remove(app.config['SETTINGS'])

	except:
		pass


	if reset_network:
		set_dhcp(False)
		write_network_addresses({ 
			'address': '192.168.1.30', 
			'netmask': '255.255.255.0', 
			'gateway': '192.168.1.1',
			'primary': '8.8.4.4',
			'secondary': '8.8.8.8' 
		})


	if reset_clock:
		ntp_servers([ 
			'0.debian.ntp.pool.org', 
			'1.debian.ntp.pool.org', 
			'2.debian.ntp.pool.org', 
			'3.debian.ntp.pool.org' 
		])
		os.system('systemctl enable ntp')


	logger = logging.getLogger('cme')
	logger.info("Factory reset (network reset: {0}, clock reset: {1}) -- rebooting in {2} seconds.".format(reset_network, reset_clock, delay))	
	
	time.sleep(delay)

	# reboot system
	os.system("reboot")




