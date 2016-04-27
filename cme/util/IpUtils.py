import os
import platform
import logging
import subprocess
import uuid
import socket
import fcntl
import struct
import fileinput

from . import is_a_cme

# RPi uses only single network interface, 'eth0'
iface = b'eth0'


def mac():
	''' Return the network interface MAC address.
	
		NOTE - only works if there's a single addressed interface.
	'''
	return str(':'.join(['{:02x}'.format((uuid.getnode() >> i) & 0xff) for i in range(0,8*6,8)][::-1])).upper()


def dhcp():
	''' Check the content of the file pointed at by the symbolic link /etc/network/interfaces.
		If it contains 'dhcp' then assume the interface is handled by the dhclient.

		If not a cme module, this function always returns True.
	'''
	if not is_a_cme():
		return True

	cmd = subprocess.run(["cat", "/etc/network/interfaces"], stdout=subprocess.PIPE)
	return cmd.stdout.decode().find('dhcp') > -1


def address():
	''' Return the current eth0 interface ip address.

		If not a cme module, this function always returns '127.0.0.30'.
	'''
	if not is_a_cme():
		return '127.0.0.30'

	sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
	ifreq = struct.pack('16sH14s', iface, socket.AF_INET, b'\x00'*14)

	res = fcntl.ioctl(sock.fileno(), 0x8915, ifreq)
	ip = struct.unpack('16sH2x4s8x', res)[2]

	return socket.inet_ntoa(ip)


def netmask():
	''' Return the current netmask.

		if not a cme device, this function always returns '255.255.255.0'.
	'''
	if not is_a_cme():
		return '255.255.255.0'

	return socket.inet_ntoa(fcntl.ioctl(socket.socket(socket.AF_INET, socket.SOCK_DGRAM), 35099, struct.pack('256s', iface))[20:24])


def gateway():
	''' Read the default gateway directly from /proc.

		If not a cme module, this function always returns '127.0.0.1'.
	'''
	if not is_a_cme():
		return '127.0.0.1'

	with open("/proc/net/route") as fh:
		for line in fh:
			fields = line.strip().split()
			if fields[1] != '00000000' or not int(fields[3], 16) & 2:
				continue

			return socket.inet_ntoa(struct.pack("<L", int(fields[2], 16)))


def set_dhcp(on=True):
	''' Sets the network interface with (or without) DHCP.  This function
		only sets the configuration.  A network restart or a full reboot
		is necessary for the change to occur.

		If not a cme device, this function does nothing.
	'''
	if not is_a_cme():
		return

	if on:
		os.system('ln -s -f /etc/network/interfaces_dhcp /etc/network/interfaces')
	else:
		os.system('ln -s -f /etc/network/interfaces_static /etc/network/interfaces')


# looks at network settings compared with current network
# and reconfigures and reloads the network if different
def manage_network(network_settings):

	reload_network = False
	currently_dhcp = dhcp()

	use_dhcp = network_settings['dhcp']

	# get the app root logger
	logger = logging.getLogger('cme')

	logger.info("Network\t\tSetting\t(current)")
	logger.info("\tMAC:\t\t{0}".format(network_settings['mac']))
	logger.info("\tDHCP:\t\t{0}\t\t({1})".format(network_settings['dhcp'], currently_dhcp))
	logger.info("\tIP:\t\t{0}\t({1})".format(network_settings['address'], address()))
	logger.info("\tMASK:\t\t{0}\t({1})".format(network_settings['netmask'], netmask()))
	logger.info("\tGATE:\t\t{0}\t({1})".format(network_settings['gateway'], gateway()))

	if not is_a_cme():
		logger.info("\tWARNING: Not a recognized CME platform - no actual changes will be made!")
		return

	# if settings say use DHCP and we're not
	if use_dhcp != currently_dhcp:
		reload_network = True

		# reset for dhcp
		if use_dhcp:
			logger.info("Setting network to DHCP configuration.")
			set_dhcp(True)

		# reset for static
		else:
			logger.info("Setting network to static configuration.")
			set_dhcp(False)

	# else dhcp settings match current state -
	# check and update addresses if we're static
	elif not use_dhcp and \
		(address() != network_settings['address'] or \
		 netmask() != network_settings['netmask'] or \
		 gateway() != network_settings['gateway']):

		reload_network = True
		logger.info("Updating network static addresses.")

	# Trigger network restart
	if reload_network:
		# update net addresses if not dhcp
		if not use_dhcp:
			write_network_addresses(network_settings)

		# restarts/reloads the network
		os.system('systemctl restart networking')


def write_network_addresses(net_settings):
	''' Updates the static network addresses (/etc/network/interfaces_static) with
		the settings passed in.

		If not a cme device, this function does nothing.
	'''
	if not is_a_cme():
		return

	network_conf = '/etc/network/interfaces_static'
	marker = "iface eth0 inet static"
	found = False
	added = False

	# pluck addresses from settings
	addresses = {
		'address': net_settings['address'],
		'netmask': net_settings['netmask'],
		'gateway': net_settings['gateway']
	}

	# fileinput uses the print functions to write to the config file
	for line in fileinput.input(network_conf, inplace=True):
		line = line.rstrip()
		found = found or line.startswith(marker)

		# dup lines until marker
		if not found or line.startswith(marker):
			print(line)
			continue

		if not added:
			added = True

			# insert our updated addresses
			for n, a in addresses.items():
				print("\t{0} {1}".format(n, a))

			# add DNS nameservers
			print("\tdns-nameservers {0} {1}".format(net_settings['primary'], net_settings['secondary']))
			print()

	fileinput.close()
