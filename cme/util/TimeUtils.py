
import os
import fileinput
import subprocess
import re

from datetime import datetime, timedelta
from .Switch import switch

def check_ntp():
	cmd = subprocess.run(["sudo", "service", "ntp", "status"], stdout=subprocess.PIPE)
	return cmd.stdout.decode().find('failed') == -1

# manage the NTP daemon and servers used in ntp.conf
def manage_time(ntp_settings):

	update_ntp = False
	currently_ntp = check_ntp()
	current_servers = __read_ntp_servers()

	use_ntp = ntp_settings['ntp']
	ntp_servers = ntp_settings['servers']

	# NTP init
	# Note that ntp should NOT be setup in init.d to start automatically:
	# > sudo update-rc.d -f ntp remove
	print("\n\tNTP\t\t\t(current)")
	print("\t---------------------------------------------")
	print("\tUSE NTP:\t{0}\t({1})".format(use_ntp, currently_ntp))
	print("\tNTP SERVERS:\t{0}\t({1})".format(ntp_servers, current_servers))

	if ntp_servers != current_servers:
		update_ntp = True
		__write_ntp_servers(ntp_servers)

	if update_ntp or (use_ntp != currently_ntp):

		if use_ntp:
			print("Starting NTP service.")
			os.system('sudo service ntp restart')

		else:
			print("Stopping NTP service.")
			os.system('sudo service ntp stop')


# update the current time
def refresh_time(ntp_settings):
	# sets the current time
	ntp_settings['current'] = datetime.utcnow().isoformat()

	# if useNTP, we'll update the NTP status
	if ntp_settings['ntp']:
		cmd = subprocess.run(["ntpq", "-pn"], stdout=subprocess.PIPE)

		#print("Refreshing NTP status:\n{0}".format(cmd.stdout.decode()))

		last_request, last_success = __parse_ntpq(cmd.stdout.decode())

		ntp_settings['status'] = [ last_request, last_success ]
	else:
		ntp_settings['status'] = [ '-', '-' ]

	# get NTPServers from /etc/ntp.conf beginning at line # CME current
	ntp_settings['servers'] = __read_ntp_servers()


# Parse the ntpq output for NTP status
# good referece here:
# http://www.linuxjournal.com/article/6812
def __parse_ntpq(ntpq_result):

	# remove header lines
	start = ntpq_result.find("===\n")

	if not start:
		return "-", "-"

	servers = ntpq_result[start+4:]

	# find NTP primary server (has * at beginning)
	exp = ("\*((?P<remote>\S+)\s+)"
		   "((?P<refid>\S+)\s+)"
		   "((?P<st>\S+)\s+)"
		   "((?P<t>\S+)\s+)"
		   "((?P<when>\S+)\s+)"
		   "((?P<poll>\S+)\s+)"
		   "((?P<reach>\S+)\s+)"
		   "((?P<delay>\S+)\s+)"
		   "((?P<offset>\S+)\s+)"
		   "((?P<jitter>\S+)\s+)")

	regex = re.compile(exp, re.MULTILINE)
	r = regex.search(servers)

	# did we find primary server?
	if not r:
		# we'll search again w/o "*" at beginning
		exp = (" ((?P<remote>\S+)\s+)"
			   "((?P<refid>\S+)\s+)"
			   "((?P<st>\S+)\s+)"
			   "((?P<t>\S+)\s+)"
			   "((?P<when>\S+)\s+)"
			   "((?P<poll>\S+)\s+)"
			   "((?P<reach>\S+)\s+)"
			   "((?P<delay>\S+)\s+)"
			   "((?P<offset>\S+)\s+)"
			   "((?P<jitter>\S+)\s+)")

		regex = re.compile(exp, re.MULTILINE)
		r = regex.search(servers)

	if not r:
		return "-", "-"

	data = r.groupdict()

	# create a timestamp for last polling time
	# this integer can have units: m = minutes, h = hours, d = days
	units = ['m', 'h', 'd']
	last_poll = data['when']
	last_poll_unit = list(last_poll)[-1]

	if "-" in list(last_poll):
		return "-", "-"

	# is there a unit character?
	if last_poll_unit in units:
		for case in switch(last_poll_unit):
			if case('m'): # minutes
				last_poll_s = int(last_poll[:-1]) * 60
				break
			if case('h'): # hours
				last_poll_s = int(last_poll[:-1]) * 60 * 60
				break
			if case('d'): # days
				last_poll_s = int(last_poll[:-1]) * 24 * 60 * 60

	else:
		last_poll_s = int(last_poll)

	last_poll_time = (datetime.now() - timedelta(seconds=last_poll_s)).isoformat()

	# how often are we polling
	poll_s = int(data['poll'])

	# look at the "reach" to calculate a last success time
	reach = int(data['reach'], 8) # convert from Octal representation

	# edge cases
	if reach == 0:
		last_success_time = "-"
	elif reach == 255:
		last_success_time = last_poll_time

	# Else the "reach" field is an 8-bit set that holds 0's for unsuccessful
	# polls (starting from the last_poll_s).  We search from the LSB to
	# the left for the first non-zero (i.e., successful poll).
	# E.g., (see the linked article above), but if we've had 8 successful
	# NTP requests, then reach = 1111 1111 (255 decimal, 377 octal).  Now
	# consider the next request is unsuccessful, the MSB is shifted out and
	# reach = 1111 1110 (253 decimal, 376 octal).  The last_successful poll
	# would have been 1 polling period earlier (first non-zero bit from left).
	# We use the "poll" field to tell how many seconds between polling then
	# use the first non-zero bit position as the multiplier.
	else:
		last_success_s = last_poll_s + __lowestSet(reach) * poll_s
		last_success_time = (datetime.now() - timedelta(seconds=(last_success_s))).isoformat()

	return last_poll_time, last_success_time



# find the lowest bit set in an int
# from https://wiki.python.org/moin/BitManipulation
def __lowestSet(int_type):
	low = (int_type & -int_type)
	lowBit = -1
	while (low):
		low >>= 1
		lowBit += 1

	return(lowBit)



# read current NTP servers from /etc/ntp.conf
def __read_ntp_servers():
	ntp_conf = "/etc/ntp.conf"
	marker = "# CME current"
	marker_found = False
	servers = []

	for line in fileinput.input(ntp_conf):
		line = line.strip()
		marker_found = marker_found or line.startswith(marker)

		# read to marker
		if not marker_found or line.startswith(marker):
			continue

		# break at next empty or comment line
		if not line or line.startswith ("#"):
			break

		# server line format (we want the address in the middle)
		# server abc.def.123.100 iburst
		servers.append(line.split()[1])

	fileinput.close()

	return servers


# write new servers to /etc/ntp.conf
def __write_ntp_servers(servers):
	ntp_conf = "/etc/ntp.conf"
	marker = "# CME current"
	marker_found = False
	servers_added = False

	for line in fileinput.input(ntp_conf, inplace=True):
		line = line.rstrip()
		marker_found = marker_found or line.startswith(marker)

		# dup lines until marker
		if not marker_found or line.startswith(marker):
			print(line)
			continue

		# insert our servers
		if not servers_added:
			servers_added = True
			for s in servers:
				print("server {0} iburst".format(s))
			print()

		# remove existing servers
		if not line.strip().startswith('server'):
			print(line)

	fileinput.close()
