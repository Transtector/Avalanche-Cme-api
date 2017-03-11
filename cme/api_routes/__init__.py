# api routes

import os, json
from datetime import datetime, timedelta

from flask import Blueprint, Response, request, send_from_directory, send_file
from werkzeug import secure_filename

from .. import app
from ..Auth import require_auth, Serializer

from ..common.UriParse import path_parse
from ..common import Config
settings = Config.USER_SETTINGS

# the api router is a Flask 'Blueprint'
router = Blueprint('apiroutes', __name__)


# API Error class wraps 
class APIError(Exception):
	status_code = 400

	def __init__(self, message, status_code=None, payload=None):
		Exception.__init__(self)
		self.message = message
		if status_code is not None:
			self.status_code = status_code
		self.payload = payload

	def to_dict(self):
		rv = dict(self.payload or ())
		rv['message'] = self.message
		return rv


@app.errorhandler(APIError)
def handle_api_error(error):
	return json_response(error.to_dict(), status=error.status_code)


# JSON repsonse wrapper w/session cookie support
def json_response(obj, status=200, force_session=False):
	res = Response(json_serialize(obj), status, mimetype='application/json')

	try:
		prev_cookie = request.cookies[Config.API.SESSION_COOKIE_NAME]
	
	except KeyError:
		prev_cookie = None

	if force_session or prev_cookie is not None:
		# generate a signed session cookie
		session_cookie = Serializer(Config.API.SECRET_KEY,
					   				expires_in = Config.API.SESSION_EXPIRATION)

		res.set_cookie(Config.API.SESSION_COOKIE_NAME,
					   session_cookie.dumps(settings['__username']),
					   expires=datetime.utcnow() + 
					   		timedelta(seconds=Config.API.SESSION_EXPIRATION))

	return res


# Filter out items named with double underscore "__" prefix
def json_filter(items):
	return {k:v for (k,v) in items if not k.startswith('__')}


def json_serialize(obj):
	''' Represent instance of a class as JSON.

	Args:
		obj -- any object (class instance)
	
	Returns:
		String that reprent JSON-encoded objectself.
	'''

	def serialize(obj):
		''' Recursively walk object's hierarchy. '''
		if isinstance(obj, (bool, int, float, str)):
			return obj

		elif isinstance(obj, dict):
			obj = { k: obj[k] for k in obj if not k.startswith("_") } # leave out "_" and "__" prefixed attributes (they're private)
			for key in obj:
				obj[key] = serialize(obj[key])
			return obj

		elif isinstance(obj, list):
			return [serialize(item) for item in obj]

		elif isinstance(obj, tuple):
			return tuple(serialize([item for item in obj]))
		
		elif hasattr(obj, '__dict__'):
			return serialize(obj.__dict__)

		elif (obj is None):
			return None

		return repr(obj) # Don't know how to handle, convert to string

	return json.dumps(serialize(obj))


def allowed_file(filename):
	''' Check passed filename extension to see if it's allowed upload.
	'''
	return '.' in filename and \
			filename.rsplit('.', 1)[1].lower() in [x.lower() for x in Config.UPDATES.ALLOWED_EXTENSIONS]


from . import (login, logout, user, channels, status, config, device, logs,
			   general, temperature, clock, http, network, snmp)

