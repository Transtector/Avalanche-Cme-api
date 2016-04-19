import os
import logging
import subprocess
import uuid
import socket
import fcntl
import struct
import fileinput

# RPi uses only single network interface, 'eth0'
iface = b'eth0'

# return network interface MAC address
# note - only works if single interface
def mac():
	return str(':'.join(['{:02x}'.format((uuid.getnode() >> i) & 0xff) for i in range(0,8*6,8)][::-1])).upper()


# Check the content of the file pointed at by the symbolic link /etc/network/interfaces.
# If it contains 'dhcp' then assume the interface is handled by the dhclient
def dhcp():
	cmd = subprocess.run(["cat", "/etc/network/interfaces"], stdout=subprocess.PIPE)
	return cmd.stdout.decode().find('dhcp') > -1


# Return the current eth0 interface ip address
def address():
	sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
	ifreq = struct.pack('16sH14s', iface, socket.AF_INET, b'\x00'*14)

	res = fcntl.ioctl(sock.fileno(), 0x8915, ifreq)
	ip = struct.unpack('16sH2x4s8x', res)[2]

	return socket.inet_ntoa(ip)


def netmask():
	return socket.inet_ntoa(fcntl.ioctl(socket.socket(socket.AF_INET, socket.SOCK_DGRAM), 35099, struct.pack('256s', iface))[20:24])


def gateway():
	'''Read the default gateway directly from /proc.'''
	with open("/proc/net/route") as fh:
		for line in fh:
			fields = line.strip().split()
			if fields[1] != '00000000' or not int(fields[3], 16) & 2:
				continue

			return socket.inet_ntoa(struct.pack("<L", int(fields[2], 16)))


# looks at network settings compared with current network
# and reconfigures and reloads the network if different
def manage_network(network_settings):

	reload_network = False
	currently_dhcp = dhcp()

	use_dhcp = network_settings['dhcp']

	# get the app root logger
	logger = logging.getLogger()

	logger.debug("\n\tNETWORKING\t\t\t(current)")
	logger.debug("\t---------------------------------------------")
	logger.debug("\tMAC:\t\t{0}".format(network_settings['mac']))
	logger.debug("\tDHCP:\t\t{0}\t\t({1})".format(network_settings['dhcp'], currently_dhcp))
	logger.debug("\tIP:\t\t{0}\t({1})".format(network_settings['address'], address()))
	logger.debug("\tMASK:\t\t{0}\t({1})".format(network_settings['netmask'], netmask()))
	logger.debug("\tGATE:\t\t{0}\t({1})".format(network_settings['gateway'], gateway()))

	# if settings say use DHCP and we're not
	if use_dhcp != currently_dhcp:
		reload_network = True

		# reset for dhcp
		if use_dhcp:
			logger.info("Setting network to DHCP configuration.")
			os.system('ln -s -f /etc/network/interfaces_dhcp /etc/network/interfaces')

		# reset for static
		else:
			logger.info("Setting network to static configuration.")
			os.system('ln -s -f /etc/network/interfaces_static /etc/network/interfaces')

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


# write new addresses to /etc/network/interfaces_static
def write_network_addresses(net_settings):

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
