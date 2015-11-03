import uuid

# return network interface MAC address
# note - only works if single interface
def get_MAC():
	return str(':'.join(['{:02x}'.format((uuid.getnode() >> i) & 0xff) for i in range(0,8*6,8)][::-1])).upper()

