import os, subprocess, time, logging

from .. import Config

from .ClockUtils import ntp_servers
from .IpUtils import set_dhcp, write_network_addresses

from . import is_a_cme, is_a_docker, docker_run

logger = logging.getLogger('cme')

def restart(delay=5, recovery_mode=False, factory_reset=False):
	''' Performs a reboot with optional configuration (including network and clock) reset.

		factory_reset simply removes the current user settings (typically found in /data/settings.json,
		but look at app.config['SETTINGS'] key to see where it might be).

		Network reset:
			1) Turn off DHCP network config
			1) Write default static addresses
			-- Network will reset to defaults after reboot

		NTP reset:
			1) Write default NTP servers
			2) Enable the ntp service
			-- NTP will reset to defaults after reboot

		recovery_mode prevents docker modules (Cme, Cme-hw) from starting and just launches the
		base API (cme) under the base OS.
	'''
	if factory_reset:
		os.remove(Config.SETTINGS)

		if is_a_cme():
			set_dhcp(False)
			write_network_addresses({ 
				'address': '192.168.1.30', 
				'netmask': '255.255.255.0', 
				'gateway': '192.168.1.1',
				'primary': '8.8.4.4',
				'secondary': '8.8.8.8' 
			})

			ntp_servers(['time.nist.gov'])

			ntp_enable = ['systemctl', 'enable', 'ntp']

			if is_a_docker():
				docker_run(ntp_enable)
			else:
				subprocess.call(ntp_enable)

		logger.info("CME configuration reset to factory defaults")
	
	if recovery_mode and not os.path.isfile(Config.RECOVERY_FILE):
		logger.info("Setting CME for recovery mode boot")
		open(Config.RECOVERY_FILE, 'w').close()
	else:
		if os.path.isfile(Config.RECOVERY_FILE):
			os.remove(Config.RECOVERY_FILE)

	_reboot(delay)


def _reboot(delay=5):
	# trigger a reboot
	logger.info("CME rebooting in {0} seconds.".format(delay))	
	
	time.sleep(delay)

	# reboot system
	if is_a_cme():

		if is_a_docker():
			docker_run(['reboot'])
		else:
			subprocess.call(['reboot'])

