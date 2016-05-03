import os, time, logging

from .ClockUtils import ntp_servers
from .IpUtils import set_dhcp, write_network_addresses

from . import is_a_cme


def reset(delay=5, reset_network=False, reset_clock=False):
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


	if reset_network and is_a_cme():
		set_dhcp(False)
		write_network_addresses({ 
			'address': '192.168.1.30', 
			'netmask': '255.255.255.0', 
			'gateway': '192.168.1.1',
			'primary': '8.8.4.4',
			'secondary': '8.8.8.8' 
		})


	if reset_clock and is_a_cme():
		ntp_servers([ 
			'0.debian.ntp.pool.org', 
			'1.debian.ntp.pool.org', 
			'2.debian.ntp.pool.org', 
			'3.debian.ntp.pool.org' 
		])
		os.system('systemctl enable ntp')

	logger = logging.getLogger('cme')
	logger.info("Factory reset (network reset: {0}, clock reset: {1})".format(reset_network, reset_clock))	
	
	restart(delay)


def restart(delay=5):
	# trigger a reboot
	logger = logging.getLogger('cme')
	logger.info("CME rebooting in {0} seconds.".format(delay))	
	
	time.sleep(delay)

	# reboot system
	if is_a_cme():
		os.system("reboot")

