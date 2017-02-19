import os
from setuptools import setup

# version (i.e., cme.firmware) is stored in the VERSION file in package root
with open(os.path.join(os.getcwd(), 'VERSION')) as f:
	version = f.readline().strip()

setup (
	name					= "cme",
	version					= version,
	description 			= "CME API with built-in web UI",
	packages				= ['cme', 'cme.api_routes', 'cme.ui_routes', 'cme.common'],
	include_package_data	= True,
	zip_safe				= False,
	install_requires		= ["CherryPy", "Paste", "Flask", "rrdtool<=0.1.4" ],
	entry_points			= {'console_scripts': ['cme = cme.__main__:main'] }
)

