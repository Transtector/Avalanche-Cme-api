# Handle general and support configuration fields

from . import router, settings, request, path_parse, json_response, APIError, require_auth

# These routes handle reading and updating the general and support fields
@router.route('/config/general/', methods=['GET', 'POST'])
@router.route('/config/general/name', methods=['GET', 'POST'])
@router.route('/config/general/description', methods=['GET', 'POST'])
@router.route('/config/general/location', methods=['GET', 'POST'])
@router.route('/config/support/', methods=['GET', 'POST'])
@router.route('/config/support/contact', methods=['GET', 'POST'])
@router.route('/config/support/email', methods=['GET', 'POST'])
@router.route('/config/support/phone', methods=['GET', 'POST'])
@require_auth
def generic_config_handler():
	# parse out the setting name (last element of request path)
	segments = path_parse(request.path)
	group = segments[-2]
	item = segments[-1]

	group_access = item == 'general' or item == 'support'

	if group_access:
		setting = settings[item]
	else:
		setting = settings[group]

	# if POST, then update setting w/POSTed value
	if request.method == 'POST':
		if group_access:
			setting = request.get_json()[item]
		else:
			setting[item] = request.get_json()[item]
			settings[group] = setting

	if group_access:
		res = { item: settings[item] }
	else:
		res = { item: settings[group][item] }

	# return json-formatted item: (k, v)
	return json_response(res)
