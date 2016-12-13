# api routes

import os, json
from datetime import datetime, timedelta

from flask import Blueprint, Response, request, send_from_directory, send_file
from werkzeug import secure_filename

from ..util.Auth import require_auth, Serializer
from ..util.UriParse import path_parse
from ..Settings import settings
from .. import Config

# the api router is a Flask 'Blueprint'
router = Blueprint('apiroutes', __name__)


# JSON repsonse wrapper w/session cookie support
def json_response(obj, status=200, force_session=False):
	res = Response(json_serialize(obj), status, mimetype='application/json')

	try:
		prev_cookie = request.cookies[Config.SESSION_COOKIE_NAME]
	
	except KeyError:
		prev_cookie = None

	if force_session or prev_cookie is not None:
		# generate a signed session cookie
		session_cookie = Serializer(Config.SECRET_KEY,
					   				expires_in = Config.SESSION_EXPIRATION)

		res.set_cookie(Config.SESSION_COOKIE_NAME,
					   session_cookie.dumps(settings['__username']),
					   expires=datetime.utcnow() + 
					   		timedelta(seconds=Config.SESSION_EXPIRATION))

	return res


# JSON reponse on errors
def json_error(err, code=500):
	return Response(err, status=code, mimetype='text/plain')


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
			obj = obj.copy()
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
			filename.rsplit('.', 1)[1].lower() in [x.lower() for x in Config.ALLOWED_EXTENSIONS]


def refresh_device():
	''' Check uploads folder for any contents.  There should only
		be at most a single file which will be used if an update
		is triggered.
	'''
	files = [fn for fn in os.listdir(Config.UPLOAD_FOLDER)
			if any(fn.endswith(ext) for ext in Config.ALLOWED_EXTENSIONS)]

	# choose the first one, if any
	settings['__device']['__update'] = '' if len(files) == 0 else files[0]


# make routes available
from . import (login, logout, user, channels, status, config, device, logs,
			   general, temperature, clock, http, network, snmp)

