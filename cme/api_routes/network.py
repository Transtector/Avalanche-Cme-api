# CME network interface configuration routes
import time, threading

from . import router, settings, request, path_parse, json_response, APIError, require_auth
from ..util.IpUtils import manage_network


@router.route('/config/network/', methods=['GET', 'POST'])
@require_auth
def network():
	if request.method == 'POST':

		newnet = request.get_json()['network']

		curnet = settings['network']

		curnet['dhcp'] = newnet['dhcp']
		curnet['address'] = newnet['address']
		curnet['netmask'] = newnet['netmask']
		curnet['gateway'] = newnet['gateway']
		curnet['primary'] = newnet['primary']
		curnet['secondary'] = newnet['secondary']

		settings['network'] = curnet

		# Network settings updated.  Reload the network after some delay
		# to give a response.  Note that manage_network() will only reload
		# the network if the settings have actually changed from current.
		t = threading.Thread(target=delay_manage_network, args=(5,))
		t.setDaemon(True)
		t.start()

	return json_response({ 'network': settings['network']})


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
	segments = path_parse(request.path)
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
	time.sleep(delay)
	manage_network(settings['network'])
