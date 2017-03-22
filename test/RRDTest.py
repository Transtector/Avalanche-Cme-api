
import os, sys, datetime, time, math, random, threading
import rrdtool

'''

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
'''

DS_A = ['DS:s0:GAUGE:10:0:300']
DS_B = ['DS:s1:GAUGE:10:0:100']
DS_C = ['DS:s0:GAUGE:10:0:100']

RRA =  [ 
	"RRA:LAST:0.5:1:1800",
	"RRA:AVERAGE:0.5:30m:17472",
	"RRA:MIN:0.5:30m:17472",
	"RRA:MAX:0.5:30m:17472"
]

RRDs = [ '' for x in range(0, 8) ]

STEP = 1 # second

ONE_WEEK = 7 * 24 * 3600 # week of seconds


def create_rrd(rrd, start, step, *args):
	print("== Creating: {0}".format(rrd))
	rrdtool.create(rrd, '--start', str(start), '--step', str(step), *args)


def update_rrd(rrd, start, duration, value1, value2=None):

	# put start just ahead of last update
	step = STEP
	end = start + duration

	tick = time.time()
	print('== Filling: {0}'.format(os.path.basename(rrd)))
	#print('\t start: {0}'.format(start))
	#print('\t end: {0}'.format(end))
	#print('\t duration/points: {0} seconds'.format(duration))

	t = int(start)
	n = 0
	while (t < end):

		if value2:
			rrdtool.update(rrd, '{0}:{1:f}:{2:f}'.format(t, value1(), value2()))

		else:
			rrdtool.update(rrd, '{0}:{1:f}'.format(t, value1()))

		#sys.stdout.write("\t\t\t\tseconds: {0}/{1} \x1b[K\r".format(n, duration)) 
		#sys.stdout.flush()
		t = t + step
		n = n + 1

	#first = rrdtool.first(rrd)
	#last = rrdtool.last(rrd)

	print('== Filled: {0} in {1} seconds'.format(os.path.basename(rrd), time.time() - tick))
	#print('\tfirst: {0}'.format(first))
	#print('\tlast: {0}'.format(last))
	#print('\tduration: {0} seconds'.format(last - first))


def base_value(ch_index, weeks, week_index, type='V'):

	week_multipler = 1 # 1.2 - (1 / weeks) * week_index

	CH = {
		0: { 'V': 208 },
		1: { 'V': 208 },
		2: { 'V': 208 },
		3: { 'PI': 1.5 },
		4: { 'V': 277, 'I': 90 },
		5: { 'V': 277, 'I': 90 },
		6: { 'V': 277, 'I': 90 },
		7: { 'PI': 0.5 }
	}

	value = CH[ch_index][type]

	# add a little random noise +/- 1% of value
	value = value + value * 0.01 * random.uniform(-1, 1)

	return value


def go(weeks_ago):

	start = int(time.time()) - weeks_ago * ONE_WEEK # start weeks ago
	data = '/Users/ssumjbrunner/workspace/Avalanche/Data/channels'


	# Create ch0, ch1, ch2, ch4, ch5, ch6
	for i in range(0, 3):
		RRDs[i] = os.path.join(data, 'ch' + str(i) + '_' + str(start) + '.rrd')
		create_rrd(RRDs[i], start, STEP, *(DS_A + RRA))

		RRDs[i + 4] =os.path.join(data, 'ch' + str(i + 4) + '_' + str(start) + '.rrd')
		create_rrd(RRDs[i + 4], start, STEP, *(DS_A + DS_B + RRA))


	# Create ch3, ch7 (PI channels)
	RRDs[3] = os.path.join(data, 'ch3_' + str(start) + '.rrd')
	create_rrd(RRDs[3], start, STEP, *(DS_C + RRA))

	RRDs[7] = os.path.join(data, 'ch7_' + str(start) + '.rrd')
	create_rrd(RRDs[7], start, STEP, *(DS_C + RRA))

	return start


def fill(start, weeks):

	# for each week since we started
	for w in range(0, weeks):

		threads = []

		s = (start + 1) + w * ONE_WEEK
		d = ONE_WEEK

		# fill up the ch0, 1, 2, 4, 5, 6
		for i in range(0, 3):

			rrd = RRDs[i]
			bv = lambda: base_value(i, weeks, w, 'V')
			#update_single_ch(rrd, s, d, bv)
			threads.append(threading.Thread(target=update_rrd, args=(rrd, s, d, bv)))

			rrd = RRDs[i + 4]
			bv = lambda: base_value(i + 4, weeks, w, 'V')
			bv2 = lambda: base_value(i + 4, weeks, w, 'I')
			#update_double_ch(rrd, s, d, bv, bv2)
			threads.append(threading.Thread(target=update_rrd, args=(rrd, s, d, bv, bv2)))

		# fill up the ch3, ch7
		rrd = RRDs[3]
		bv = lambda: base_value(3, weeks, w, 'PI')
		#update_single_ch(rrd, s, d, bv)
		threads.append(threading.Thread(target=update_rrd, args=(rrd, s, d, bv)))

		rrd = RRDs[7]
		bv = lambda: base_value(7, weeks, w, 'PI')
		#update_single_ch(rrd, s, d, bv)
		threads.append(threading.Thread(target=update_rrd, args=(rrd, s, d, bv)))

		# fill one week at a time
		for t in threads:
			t.start()
		for t in threads:
			t.join()



