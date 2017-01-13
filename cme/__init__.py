# Flask is the wsgi application that sits
# behind the CherryPy server
from flask import Flask

# initialize the Flask application
app = Flask('cme', static_url_path='')
