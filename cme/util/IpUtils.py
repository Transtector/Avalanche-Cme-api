import subprocess
import uuid
import socket
import fcntl
import struct

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
	return socket.gethostbyname(socket.gethostname())

def netmask():
	iface = b'eth0'
	return socket.inet_ntoa(fcntl.ioctl(socket.socket(socket.AF_INET, socket.SOCK_DGRAM), 35099, struct.pack('256s', iface))[20:24])

def gateway():
	return 'gateway'