from functools import wraps
from flask import Response, request, json
from itsdangerous import (TimedJSONWebSignatureSerializer
						  as Serializer, BadSignature, SignatureExpired)

from .. import Config

# access denied
def access_denied(message='Access denied'):
	return Response(json.dumps([ message ]),
					status=403,
					mimetype='application/json')

# wrapper for all routes requiring authentication
def require_auth(f):
	@wraps(f)
	def decorated(*args, **kwargs):
		# read token from session cookie
		s = Serializer(Config.SECRET_KEY,
					   expires_in = Config.SESSION_EXPIRATION)

		try:
			token = request.cookies[Config.SESSION_COOKIE_NAME]

		except KeyError:
			return access_denied('Invalid session cookie')

		# verify the token
		try:
			authenticated = s.loads(token)
		except SignatureExpired:
			return access_denied('Session cookie signature expired')
		except BadSignature:
			return access_denied('Invalid session cookie signature')

		# allowed
		return f(*args, **kwargs)

	return decorated
