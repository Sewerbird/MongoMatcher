MongoMatcher
============

Run mongo selector on an arbitrary javascript object to see if it is matched!

###USAGE###

First, import MongoMatcher using the `require` command. MongoMatcher has a dependency on LoDash

    var mongoMatcher = require('./mongoMatcher.js');

Now, you can instantiate a matcher for a given MongoDB selector object, like so:

    var mySelector = {$and:[{foo:"bar"},{wham:"bam"}]}
    var myMatcher = new mongoMatcher(mySelector);

After you do this, you can see if a Javascript object would be matched by the MongoDB selector using the `discern` function

	var willMatch = {foo:"bar",wham:"bam"}
	var wontMatch = {foo:"baz",wham:"bam"}

	myMatcher.discern(willMatch)	//true
	myMatcher.discern(wontMatch)	//false

And that's it! 

###LIMITATIONS###

Currently, MongoMatcher is meant only for MongoDB selectors (not modifiers) and does not support all keywords. Hopefully all the keywords will be supported in the future: feel free to contribute them! 

Unsupported operators are:

 * $type
 * $regex
 * $where
 * $text
 * $geoIntersects
 * $geoWithin
 * $nearSphere
 * $near
 * $
 * $elemMatch
 * $meta
 * $slice
