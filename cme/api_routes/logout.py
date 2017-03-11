# logout - disposes the session cookie

from . import Response, router, Config

@router.route('/logout')
def logout():
	res = Response('', status=200)
	res.set_cookie(Config.API.SESSION_COOKIE_NAME, '', expires=0)
	return res

