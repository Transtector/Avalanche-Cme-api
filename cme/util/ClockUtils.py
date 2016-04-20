
import os
import logging
import fileinput
import subprocess
import re

from datetime import datetime, timedelta
from .Switch import switch

def set_clock(newtime):
	''' use the system 'date' command to set it
		format of newtime string: "%Y-%m-%dT%H:%M:%S.SSSSSS"
		TODO: parse/validate the format
	'''
	os.system('date -s "{0}"'.format(newtime))

def check_ntp():
	''' Requests ntpd status from the system.  Returns True if ntp is currently being used. '''
	cmd = subprocess.run(["systemctl", "status", "ntp"], stdout=subprocess.PIPE)
	return cmd.stdout.decode().find('inactive') == -1

# manage the NTP daemon and servers used in ntp.conf
def manage_clock(clock_settings):

	update_ntp = False
	current_ntp = check_ntp()
	current_servers = ntp_servers()

	new_use_ntp = clock_settings['ntp']
	new_ntp_servers = clock_settings['servers']

	# NTP init
	# Note that ntp should NOT be setup in init.d to start automatically:
	# root@minibian:~# systemctl disable ntp
	logger = logging.getLogger('cme')

	logger.info("NTP\t\tSetting\t(current)")
	logger.info("\tUSE NTP:\t{0}\t({1})".format(new_use_ntp, current_ntp))
	logger.info("\tSERVERS:\t{0}\t({1})".format(new_ntp_servers, current_servers))

	if new_ntp_servers != current_servers:
		update_ntp = True
		ntp_servers(new_ntp_servers)

	if update_ntp or (new_use_ntp != current_ntp):

		if new_use_ntp:
			logger.info("Starting NTP service.")
			os.system('systemctl enable ntp')
			os.system('systemctl start ntp')

		else:
			logger.info("Stopping NTP service.")
			os.system('systemctl stop ntp')
			os.system('systemctl disable ntp')


def refresh_time(clock_settings):
	''' Update the current clock settings with values from the system '''

	# if useNTP, we'll update the NTP status
	if clock_settings['ntp']:
		cmd = subprocess.run(["ntpq", "-pn"], stdout=subprocess.PIPE)
		last_request, last_success = __parse_ntpq(cmd.stdout.decode())
		clock_settings['status'] = [ last_request, last_success ]
	else:
		clock_settings['status'] = [ '-', '-' ]

	# read ntp servers from /etc/ntp.conf
	clock_settings['servers'] = ntp_servers()


def ntp_servers(new_servers=None):
	''' 
		Reads current NTP servers from /etc/ntp.conf.

		If new_servers is not None, then ntp.conf will
		be updated with the new servers.  ntp service restart
		will be required to pick up the new servers.
	'''
	ntp_conf = "/etc/ntp.conf"
	servers = new_servers or []
	servers_added = False
	writing = new_servers is not None

	# the fileinput hijacks std.output, so the prints below go to the
	# file, not the console.
	with fileinput.input(files=(ntp_conf), inplace=writing) as f:
		for line in f:
			line = line.strip()

			# read (and dup lines if writing) to "server" entry(ies)
			if not line.startswith("server"):
				if writing:
					print(line)
				continue

			# insert new servers
			if writing and not servers_added:
				servers_added = True
				for s in new_servers:
					print("server {0} iburst".format(s))
				print()

			# append found servers if we're reading
			if not writing:
				# server line format (we want the address in the middle)
				# server abc.def.123.100 iburst
				servers.append(line.split()[1])

	# EDGE CASE: We're updating the servers, but there were no current
	# servers in the file (and thus no "server" lines), so we've reached
	# the end of the file without adding our new_servers.  If we do
	# actually have some new_servers, we'll add them now at the end of the file.
	if writing and not servers_added:
		with open(ntp_conf, "a") as f:
			f.write('\n# NTP servers\n')
			for s in new_servers:
				f.write("server {0} iburst\n".format(s))
			f.write('\n')

	return servers


def __parse_ntpq(ntpq_result):
	''' Parse the ntpq output for NTP status
		good referece:	http://www.linuxjournal.com/article/6812
	'''

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

	last_poll_time = (datetime.utcnow() - timedelta(seconds=last_poll_s)).isoformat()

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
		last_success_s = (last_poll_s + __lowestSet(reach) * poll_s)
		last_success_time = (datetime.utcnow() - timedelta(seconds=(last_success_s))).isoformat() + 'Z'

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


