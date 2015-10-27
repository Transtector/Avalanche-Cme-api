# logout - disposes the session cookie

from . import Response, app, router

@router.route('/logout')
def logout():
	res = Response('', status=200)
	res.set_cookie(app.config['SESSION_COOKIE_NAME'], '', expires=0)
	return res

