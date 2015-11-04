import subprocess
import uuid
import socket
import fcntl
import struct

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

	try:
		res = fcntl.ioctl(desock.fileno(), 0x8915, ifreq)
	except:
		return None

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

