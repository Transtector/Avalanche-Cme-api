import cme
import json
from cme.ui_routes import index

import unittest

class IndexTestCase(unittest.TestCase):

	def setUp(self):
		cme.app.config['TESTING'] = True
		self.app = cme.app.test_client()

	def tearDown(self):
		return

	def login(self, username, password):
		url = '/api/login?u=' + username + '&p=' + password
		return self.app.get(url, follow_redirects=True)

	def logout(self):
		return self.app.get('/api/logout', follow_redirects=True)

	def res_data(self, res):
		return json.loads(res.data.decode())

	def res_error(self, res):
		return self.res_data(res)[0]

	def test_index(self):
		rv = self.app.get('/', follow_redirects=True)
		assert 'Avalanche' in rv.data.decode()
		assert rv.status_code == 200

	def test_api_root(self):
		rv = self.app.get('/api', follow_redirects=True)
		assert rv.status_code == 403
		assert self.res_error(rv) == 'Invalid session cookie'

	def test_login_logout(self):
		u = 'admin'
		p = cme.app.config['PASSHASH']

		rv = self.login('x', 'x')
		assert rv.status_code == 200
		assert 'Login failed' in self.res_error(rv)

		rv = self.login(u, 'x')
		assert rv.status_code == 200
		assert 'Login failed' in self.res_error(rv)

		rv = self.login(u, p)
		assert rv.status_code == 200
		assert self.res_data(rv) is not None

		rv = self.logout()
		assert rv.data.decode() == ''
		assert rv.status_code == 200



if __name__ == '__main__':
	unittest.main()