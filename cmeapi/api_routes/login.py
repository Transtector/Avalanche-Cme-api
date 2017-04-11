# login API session handling
# Provide access to API session token (cookie)
# given matching username and passhash

from . import settings, router, request, require_auth, json_response, APIError
from .status import timestamp

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

# CME root (index) request
@router.route('/')
@require_auth
def index():
	return json_response({ 'timestamp': timestamp() })