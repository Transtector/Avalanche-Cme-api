# from http://stackoverflow.com/a/25496309
import urllib.parse
import sys
import posixpath
import ntpath
import json

def path_parse( path_string, *, normalize = True, module = posixpath ):
    result = []
    if normalize:
        tmp = module.normpath( path_string )
    else:
        tmp = path_string
    while tmp != "/":
        ( tmp, item ) = module.split( tmp )
        result.insert( 0, item )
    return result

def dump_array( array ):
    string = "[ "
    for index, item in enumerate( array ):
        if index > 0:
            string += ", "
        string += "\"{}\"".format( item )
    string += " ]"
    return string

def test_url( url, *, normalize = True, module = posixpath ):
    url_parsed = urllib.parse.urlparse( url )
    path_parsed = path_parse( urllib.parse.unquote( url_parsed.path ),
        normalize=normalize, module=module )
    sys.stdout.write( "{}\n  --[n={},m={}]-->\n    {}\n".format(
        url, normalize, module.__name__, dump_array( path_parsed ) ) )

if __name__ == "__main__":

	test_url( "http://eg.com/hithere/something/else" )
	test_url( "http://eg.com/hithere/something/else/" )
	test_url( "http://eg.com/hithere/something/else/", normalize = False )
	test_url( "http://eg.com/hithere/../else" )
	test_url( "http://eg.com/hithere/../else", normalize = False )
	test_url( "http://eg.com/hithere/../../else" )
	test_url( "http://eg.com/hithere/../../else", normalize = False )
	test_url( "http://eg.com/hithere/something/./else" )
	test_url( "http://eg.com/hithere/something/./else", normalize = False )
	test_url( "http://eg.com/hithere/something/./else/./" )
	test_url( "http://eg.com/hithere/something/./else/./", normalize = False )

	test_url( "http://eg.com/see%5C/if%5C/this%5C/works", normalize = False )
	test_url( "http://eg.com/see%5C/if%5C/this%5C/works", normalize = False,
		module = ntpath )
