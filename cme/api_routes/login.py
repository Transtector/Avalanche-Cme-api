# login API session handling
# Provide access to API session token (cookie)
# given matching username and passhash

from . import app, settings, router, request, Serializer

from .util import json_response
from .status import status

@router.route('/login')
def login():
	u = request.args.get('u')
	p = request.args.get('p')

	if u != settings['__username']:
		return json_response([ 'Login failed.  Unknown user.' ])

	if p != settings['__passhash']:
		return json_response([ 'Login failed.  Invalid password.' ]),

	# else we've got valid login

	# generate a signed token
	s = Serializer(app.config['SECRET_KEY'],
				   expires_in = app.config['SESSION_EXPIRATION'])
	token = s.dumps(u)

	# send response with session_cookie = token
	return json_response(status, token)

