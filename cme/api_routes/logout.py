# logout - disposes the session cookie

from . import Response, router
from ..common import Config

@router.route('/logout')
def logout():
	res = Response('', status=200)
	res.set_cookie(Config.SESSION_COOKIE_NAME, '', expires=0)
	return res

