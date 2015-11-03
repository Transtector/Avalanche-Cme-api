import subprocess
import uuid

# return network interface MAC address
# note - only works if single interface
def mac():
	return str(':'.join(['{:02x}'.format((uuid.getnode() >> i) & 0xff) for i in range(0,8*6,8)][::-1])).upper()


# Check the content of the file pointed at by the symbolic link /etc/network/interfaces.
# If it contains 'dhcp' then assume the interface is handled by the dhclient
def dhcp():
	cmd = subprocess.run(["cat", "/etc/network/interfaces"], stdout=subprocess.PIPE)
	return cmd.stdout.decode().find('dhcp') > -1