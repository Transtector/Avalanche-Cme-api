# CME user profile

from . import router, settings, request, UriParse

from .auth import require_auth
from .util import json_response, json_error

@router.route('/user/', methods=['POST'])
@require_auth
def user():

	newuser = request.get_json()['user']

	try:
		u = newuser['username']

	except KeyError:
		return json_error(['Error updating profile - missing username'], code=400)

	try:
		p = newuser['password']

	except KeyError:
		return json_error(['Error updating profile - missing password'], code=400)

	if not (u and p):
		return json_error(['Error updating profile - username and password cannot be empty'], code=400)

	# md5(password) = 128-bit or 32 hex digits
	if not len(p) == 32:
		return json_error(['Error updating profile - invalid password format'], code=400)

	settings['__username'] = newuser['username']
	settings['__passhash'] = newuser['password']

	return json_response([ 'User profile successfully updated.' ])
