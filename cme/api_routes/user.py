# CME user profile

from . import router, settings, request, json_response, APIError, require_auth

@router.route('/user/', methods=['POST'])
@require_auth
def user():

	newuser = request.get_json()['user']

	try:
		u = newuser['username']

	except KeyError:
		raise APIError('Error updating profile - missing username', 400)

	try:
		p = newuser['password']

	except KeyError:
		raise APIError('Error updating profile - missing password', 400)

	# md5(password) = 128-bit or 32 hex digits
	if not len(p) == 32:
		raise APIError('Error updating profile - invalid password format', 400)

	# empty username/password preserves current settings
	settings['__username'] = u or settings['__username']
	settings['__passhash'] = p or settings['__passhash']

	return json_response(None)
