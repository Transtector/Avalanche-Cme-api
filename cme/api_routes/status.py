# root level api access provides CME status

from . import router

from .auth import require_auth
from .util import json_response

status = {
	'_timestamp': 1442608142531,
	'data': [
		{ '_id_SG0': [ { '_id_SX0': 119.997 }, { '_id_SX1': 13.01 } ] },
		{ '_id_SG1': [ { '_id_SY0': 121.003 }, { '_id_SY1': 12.95 } ] }
	]
}


# CME status request
@router.route('/')
@require_auth
def index():
	return json_response(status)
