# Adding this here so submodules can import 'app' (from .. import app) to
# access the various Flask routines.
from flask import Flask
app = Flask(__name__) # use the package name, "cmeapi"
