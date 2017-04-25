# root level CME API

from datetime import datetime, timezone
from . import router, request, Response, json_response, APIError, require_auth, settings, Config, timestamp


@router.route('/login')
def login():
	u = request.args.get('u')
	p = request.args.get('p')

	if u.lower() != settings['__username'].lower():
		raise APIError('Login failed - unknown user.', 403)

	if p != settings['__passhash']:
		raise APIError('Login failed - invalid password.', 403)

	# else we've got valid login send response and force set session
	return json_response({ 'timestamp': timestamp() }, force_session=True)



@router.route('/logout')
def logout():
	res = Response('', status=200)
	res.set_cookie(Config.API.SESSION_COOKIE_NAME, '', expires=0)
	return res


@router.route('/user', methods=['POST'])
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


@router.route('/')
@router.route('/clock')
@require_auth
def clock():
	''' CME date/time requuest.
	'''
	return json_response({ 'clock': timestamp() })


@router.route('/temperature')
@require_auth
def temperature():
	''' Try to read temperature (could fail if not on RPi) millidegrees C.
	'''
	try:
		temp_C = int(open('/sys/class/thermal/thermal_zone0/temp').read()) / 1e3
	except:
		temp_C = -40.0 # Not on a RPi

	return json_response({ 'temperature': temp_C })

