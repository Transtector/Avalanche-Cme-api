# CME network interface configuration routes

from . import router, settings, request, UriParse

from .auth import require_auth
from .util import json_response, json_error
from ..util.IpUtils import manage_network

import time
import threading

@router.route('/config/network', methods=['GET', 'POST'])
@require_auth
def network():
	if request.method == 'POST':
		return json_error([ 'Not implemented' ])

	return json_response(settings['network'])


@router.route('/config/network/mac')
@require_auth
def mac():
	return json_response({'mac': settings['network']['mac']})


@router.route('/config/network/dhcp', methods=['GET', 'POST'])
@router.route('/config/network/address', methods=['GET', 'POST'])
@router.route('/config/network/netmask', methods=['GET', 'POST'])
@router.route('/config/network/gateway', methods=['GET', 'POST'])
@router.route('/config/network/primary', methods=['GET', 'POST'])
@router.route('/config/network/secondary', methods=['GET', 'POST'])
@require_auth
def network_general():
	# parse out the setting item (last element of request path)
	segments = UriParse.path_parse(request.path)
	item = segments[-1]

	if request.method == 'POST':
		settings_group = settings['network']
		settings_group[item] = request.get_json()[item]
		settings['network'] = settings_group

		# Network settings updated.  Reload the network after some delay
		# to give a response.  Note that manage_network() will only reload
		# the network if the settings have actually changed from current.
		t = threading.Thread(target=delay_manage_network, args=(5,))
		t.setDaemon(True)
		t.start()

	return json_response({ item: settings['network'][item] })

def delay_manage_network(delay=5):
	print("Network management in {0} seconds...".format(delay))
	time.sleep(delay)
	manage_network(settings['network'])
