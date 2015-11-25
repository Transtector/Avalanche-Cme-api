
from . import Response, json, app

# JSON repsonse wrapper w/session cookie support
def json_response(js, session_cookie=None):
	res = Response(json.dumps(js), status=200, mimetype='application/json')

	if session_cookie is not None:
		res.set_cookie(app.config['SESSION_COOKIE_NAME'],
					   session_cookie,
					   max_age=app.config['SESSION_EXPIRATION'])

	return res


# JSON reponse on errors
def json_error(js, code=500):
	res = Response(json.dumps(js), status=code, mimetype='application/json')

	return res

# Filter out items named with double underscore "__" prefix
def json_filter(items):
	return {k:v for (k,v) in items if not k.startswith('__')}

