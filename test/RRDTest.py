
import os, sys, datetime, math
import rrdtool

class RRDTest():

	def __init__(self, rrd='rrdtest.rrd', rrdcached=None, datadir=None):

		self.RRD = rrd
		self.RRDCACHED = rrdcached
		self.RRD_PATH = datadir + rrd if datadir else rrd


	def _rrdcreate(self, *args):
		if self.RRDCACHED:
			return rrdtool.create(self.RRD, '-d', self.RRDCACHED, *args)
		return rrdtool.create(self.RRD_PATH, *args)


	def _rrdupdate(self, *args):
		if self.RRDCACHED:
			return rrdtool.update(self.RRD, '-d', self.RRDCACHED, *args)
		return rrdtool.update(self.RRD_PATH, *args)


	def _rrdfetch(self, *args):
		if self.RRDCACHED:
			return rrdtool.fetch(self.RRD, '-d', self.RRDCACHED, *args)
		return rrdtool.fetch(self.RRD_PATH, *args)


	def _rrdinfo(self):
		if self.RRDCACHED:
			return rrdtool.info(self.RRD, '-d', self.RRDCACHED)
		return rrdtool.info(self.RRD_PATH)


	def _rrdfirst(self):
		if self.RRDCACHED:
			return rrdtool.first(self.RRD, '-d', self.RRDCACHED)
		return rrdtool.first(self.RRD_PATH)


	def _rrdlast(self):
		if self.RRDCACHED:
			return rrdtool.last(self.RRD, '-d', self.RRDCACHED)
		return rrdtool.last(self.RRD_PATH)


	def create(self, startDate, step=1):

		start = startDate.timestamp()

		DS = ['DS:fake:GAUGE:10:0:300']

		RRA = [ 
			# real-time - every point for 2 hours (3600 points/hour)
			'RRA:LAST:0.5:1:{:d}'.format( 2 * 3600 ),

			# daily - 5 minute stats for a day (12 5m blocks per hour)
			'RRA:AVERAGE:0.5:5m:{:d}'.format( 12 * 24 ),
			'RRA:MIN:0.5:5m:{:d}'.format( 12 * 24 ),
			'RRA:MAX:0.5:5m:{:d}'.format( 12 * 24 ),

			# weekly - 30 minute stats for 7 days (48 30m blocks per day)
			'RRA:AVERAGE:0.5:30m:{:d}'.format( 48 * 7 ),
			'RRA:MIN:0.5:30m:{:d}'.format( 48 * 7 ),
			'RRA:MAX:0.5:30m:{:d}'.format( 48 * 7 ),

			# monthly - 2 hour stats for 31 days (12 2h blocks per day)
			'RRA:AVERAGE:0.5:2h:{:d}'.format( 12 * 31 ),
			'RRA:MIN:0.5:2h:{:d}'.format( 12 * 31 ),
			'RRA:MAX:0.5:2h:{:d}'.format( 12 * 31 ),

			# yearly - 1 day stats for 365 days
			'RRA:AVERAGE:0.5:1d:{:d}'.format( 1 * 365 ),
			'RRA:MIN:0.5:1d:{:d}'.format( 1 * 365 ),
			'RRA:MAX:0.5:1d:{:d}'.format( 1 * 365 )
		]

		self._rrdcreate('--start', '{0}'.format(int(start)), '--step', '{0}'.format(int(step)), *(DS + RRA))
		print('== RRD {0} created'.format(self.RRD_PATH))
		print('\tfirst: {0}'.format(self.first()))
		print('\tlast: {0}'.format(self.last()))
		print('\tduration: {0} seconds'.format(self.last() - self.first()))


	def update(self, step=1, duration=3600):

		# put start just ahead of last update
		start = self.last() + step
		end = start + duration

		print('== RRD {0} filling'.format(self.RRD_PATH))
		print('\t start: {0}'.format(start))
		print('\t end: {0}'.format(end))
		print('\t duration/points: {0} seconds'.format(duration))

		t = int(start)
		n = 0
		while (t < end):

			volts = 120 + 2 * math.sin( ( math.pi * n ) / 1800)
			
			self._rrdupdate('{0}:{1:f}'.format(t, volts))

			sys.stdout.write("\tseconds: {0}/{1} \x1b[K\r".format(n, duration )) 
			sys.stdout.flush()
			t = t + step
			n = n + 1

		print('\n== RRD {0} filled'.format(self.RRD_PATH))
		print('\tfirst: {0}'.format(self.first()))
		print('\tlast: {0}'.format(self.last()))
		print('\tduration: {0} seconds'.format(self.last() - self.first()))


	def fetch(self, *args):
		return self._rrdfetch(*args)

	def info(self):
		return self._rrdinfo()

	def last(self):
		return self._rrdlast()

	def first(self):
		return self._rrdfirst()

