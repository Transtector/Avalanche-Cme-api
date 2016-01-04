# login API session handling
# Provide access to API session token (cookie)
# given matching username and passhash

from . import app, settings, router, request

from .util import json_response
from .status import status

@router.route('/login')
def login():
	u = request.args.get('u')
	p = request.args.get('p')

	if u.lower() != settings['__username'].lower():
		return json_response([ 'Login failed - unknown user.' ])

	if p != settings['__passhash']:
		return json_response([ 'Login failed - invalid password.' ]),

	# else we've got valid login send response and force set session
	return json_response(status(), True)
