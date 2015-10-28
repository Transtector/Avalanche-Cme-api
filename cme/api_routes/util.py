# api utility functions

import os
import fileinput
import subprocess
import re

from datetime import datetime, timedelta
from . import Response, json, app, settings

# JSON repsonse wrapper w/session cookie support
def json_response(js, session_cookie=None):
	res = Response(json.dumps(js), status=200, mimetype='application/json')

	if session_cookie is not None:
		res.set_cookie(app.config['SESSION_COOKIE_NAME'],
					   session_cookie,
					   max_age=app.config['SESSION_EXPIRATION'])

	return res


# JSON reponse on errors
def json_error(js, code=500):
	res = Response(json.dumps(js), status=code, mimetype='application/json')

	return res


# check for firmware update file presence
def refresh_device():
	''' Check uploads folder for any contents.  There should only
		be at most a single file which will be used if an update
		is triggered.'''

	files = [fn for fn in os.listdir(app.config['UPLOADS'])
			if any(fn.endswith(ext) for ext in app.config['ALLOWED_EXTENSIONS'])]

	# choose the first one, if any
	settings['device']['update'] = '' if len(files) == 0 else files[0]


# update the current time
def refresh_time():
	# sets the current time
	settings['time']['current'] = datetime.utcnow().isoformat()

	# if useNTP, we'll update the NTPStatus
	if settings['time']['useNTP']:
		cmd = subprocess.run(["ntpq", "-pn"], stdout=subprocess.PIPE)
		last_request, last_success = __parse_ntpq(cmd.stdout.decode())

		settings['time']['NTPStatus'] = [ last_request, last_success ]

	# get NTPServers from /etc/ntp.conf beginning at line # CME current
	settings['time']['NTPServers'] = __read_ntp_servers()


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
	last_poll_s = int(data['when'])
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
def write_ntp_servers(servers):
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
