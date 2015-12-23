
from . import Response, json, app

# JSON repsonse wrapper w/session cookie support
def json_response(obj, session_cookie=None):
	res = Response(json_serialize(obj), status=200, mimetype='application/json')

	if session_cookie is not None:
		res.set_cookie(app.config['SESSION_COOKIE_NAME'],
					   session_cookie,
					   max_age=app.config['SESSION_EXPIRATION'])

	return res


# JSON reponse on errors
def json_error(obj, code=500):
	res = Response(json.serialize(obj), status=code, mimetype='application/json')

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