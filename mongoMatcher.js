var _ = require('lodash');


var MongoMatcher = function(selector){
	var self = this;
	this.seed = selector;
	this.mongoOps = [
		"$exists","$type",	//element NO/OK
		"$mod", "$regex","$where","$text",	//evaluation NO/OK
		"$and","$or","$nor","$not", //logical OK
		"$geoIntersects","$geoWithin","$nearSphere","$near", //geospatial NO
		"$all", "$size",	//array OK
		"$","$elemMatch","$meta","$slice",	 //projection NO
		"$gt","$gte","$lt","$lte","$ne","$in","$nin",	//comparison OK
	]
	this.supportedOps = _.without(this.mongoOps,
			"$type",	//TODO: unsupported element ops
			"$regex","$where","$text",	//TODO: unsupported evaluation ops
			"$geoIntersects","$geoWithin","$nearSphere","$near",	//TODO: unsupported geoJSON ops
			"$","$elemMatch","$meta","$slice"	//TODO: unsupported array & projection ops
		);
	if(_.isEqual(selector,{}))
		this.evaluator = function(doc){return true}
	else
		this.evaluator = this.growCriterion(selector);
}

//Transforms a selector into a function that can determine if a document is matched by the selector
MongoMatcher.prototype.growCriterion = function(obj, parentKey, noop){
	var self = this;
	if(_.isPlainObject(obj)){
		var criteria = _.map(obj,function(v,k){
			if(self.isOperator(k)){
				//This is a $operator associated with parentKey
				return self.condenseToEvaluator(k,parentKey,v)
			}
			else if(_.isString(k) && !noop){//this is a "{foo:{...}}" scenario: see what's inside/recurse
				return self.growCriterion(v,parentKey + parentKey?".":"" + k,true)
			}
			else if(_.isString(k)){//this is a "{foo:{bar:{wham:1}}}" situation where foo has to have the object as its value
				return function(doc){return _.isEqual(self.find(doc,parentKey), obj)}
			}
		})
		return function(doc){return _.reduce(criteria,function(memo,val){return memo && _.isFunction(val) && val(doc)},true)}
	}
	else if(_.isArray(obj) 
		 || _.isPlainObject(obj)
		 || _.isNumber(obj) 
		 || _.isString(obj) 
		 || _.isBoolean(obj) 
		 || _.isNull(obj) 
		 || _.isRegExp(obj)){//Supported non-recursing cases
		return function(doc){console.log(parentKey);return _.isEqual(self.find(doc,parentKey), obj)}
	}

}
MongoMatcher.prototype.condenseToEvaluator = function(operator,key,value){
	var self = this
	switch(operator){
		case "$gt":
			return function(doc){return self.find(doc,key) > value}
		case "$gte":
			return function(doc){return self.find(doc,key) >= value}
		case "$lt":
			return function(doc){return self.find(doc,key) < value}
		case "$lte":
			return function(doc){return self.find(doc,key) <= value}
		case "$ne":
			return function(doc){return self.find(doc,key) != value}
		case "$exists":
			return function(doc){return value>0?self.find(doc,key)!=undefined:self.find(doc,key)==undefined}
		case "$in":
			return function(doc){return _.contains(value, self.find(doc,key))}
		case "$nin":
			return function(doc){return !_.contains(value, self.find(doc,key))}
		case "$mod":
			return function(doc){return self.find(doc,key)%value[0] == value[1]}
		case "$and":
			return function(doc){return _.every(value,function(val){return self.growCriterion(val,undefined)(doc)})}
		case "$or":
			return function(doc){return _.some(value,function(val){return self.growCriterion(val,undefined)(doc)})}
		case "$nor":
			return function(doc){return !_.some(value,function(val){return self.growCriterion(val,undefined)(doc)})}
		case "$not":
			return function(doc){return !self.growCriterion(value,key)(doc)}
		case "$all":
			return function(doc){var tgt = self.find(doc,key); return _.size(_.union(value, tgt)) == _.size(tgt)}
		case "$size":
			return function(doc){return _.size(self.find(doc,key)) == value}
		default :
			return function(doc){return true};//TODO: Assumes doc matches if we aren't sure how to handle this operator
	}
}
MongoMatcher.prototype.isOperator = function(key){
	return _.contains(this.mongoOps, key);
}
MongoMatcher.prototype.find = function(obj,key){
	if(!obj) return undefined;
		var idx = key.indexOf(".");
	  if (idx === -1) {
	      return obj[key];
	  }
	  var thisKey = key.substring(0,idx);
	  var keys = key.substring(idx+1);
	  if(_.has(obj,thisKey))
	    return this.find(obj[thisKey],keys)
	  else
	    return undefined
}
MongoMatcher.prototype.discern = function(doc){
	var self = this;
	var i = 0;
	try
	{
		var evaluation = self.evaluator(doc);
		while(_.isFunction(evaluation))
		{
			evaluation = evaluation(doc)
		}
		return evaluation;
	}catch(e){
		return "Selector ("+JSON.stringify(self.seed)+") Invalid for discernment on "+JSON.stringify(doc)+".";
	}
}

module.exports = MongoMatcher;