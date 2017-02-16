'use strict';

angular.module('pTreeSelect')
.filter('pTreeFilter', [ function() {
	return function(input, filter) {
		// filtering by item name
		// keeping the fillers in the list
		// NOT calling filterChange() on 'list' to safe us one extra $watch
		// because the filter gets also called upon scrolling where curY should not be touched here
		var ret = [], regexp;
		if( ! filter ) return input;
		regexp = new RegExp(filter, 'i');
		for( var i = 0, item = null; item = input[i]; i++ ) {
			if( item.__filler || item.name.match(regexp) ) ret.push(item);
		}
		return ret;
  };
}])
.filter('pTreeLimitTo', [ function() {
	// Our Angular version's version of limitTo does not support a begin argument...
	// It does not fully support Angular's new version of limitTo but what we need.
	// And the offset! We need that one as well...
	return function(input, limit, begin, offset) {
		if( ! input || ! input.length ) return input; // can happen during init when provided a Promise
		if( ! offset ) offset = 0;
		if( ! begin ) begin = 0;
    return limit > 0 ? input.slice(begin + offset, begin + limit + offset) : input.slice(begin);
  };
}])
.filter('pTreeSkip', [ 'pTreeSelectSvc', function(pTreeSelectSvc) {
	return function(input, svc) {
		if( ! input || ! input.length ) return input; // during init if given a Promise...
		var curX = svc.getCurX();
    return input.slice(curX);
  };
}])
.filter('pTreeItems', [ 'pTreeSelectSvc', function(pTreeSelectSvc) {
	return function(input, svc, ctx) {
		if( ! input || ! input.length ) return input; // can happen during init when provided a Promise
		if( ctx.lookupCached && ctx.lookupCache && ctx.filterCache === ctx.filter ) return ctx.lookupCache;
		var ret = [];
		ret = svc.relationshipsFilter(input);
		var emptyItem = input[svc.cfg.offsetY];
		// gapNode can be first
		if( ! emptyItem.__empty ) emptyItem = input[svc.cfg.offsetY + 1];
		if( emptyItem.__empty ) {
			// emptyItem is to be shown if no 'real' item matches and if gapLookup is diabled or returned an empty list
			emptyItem.__hidden = ret.some(item => !item.__filler || ( item.__noMatch && ! item.__hidden ) ); // any 'real' item in the list?
		} else {
			console.error('Panic, __empty item not found!');
		}
		// The lookupCache is used to speed up scrolling; let's hope it will not cause any issues :-)
		ctx.lookupCache = ret;
		return ret;
  };
}])
.filter('pTreeUnique', [ function() {
	return function(input, key) {
		if( ! input || ! input.length ) return input; // can happen during init when provided a Promise
		var seen = {};
		var ret = input.reduce(function(prev, cur) {
			if( cur.__filler || ! seen[cur[key]] ) prev.push(cur);
			seen[cur[key]] = 1;
			return prev;
		}, []);
		return ret;
  };
}])
.filter('pTreeOrderBy', [ function() {
	return function(input, key) {
		if( ! input || ! input.length ) return input; // can happen during init when provided a Promise
		var ret = [], fillers = 0;
		for( let idx in input ) {
			let item = input[idx];
			if( item.__filler ) { 
				ret.push(item);
				fillers++;
				continue;
			} else if( ret.length === fillers || item[key] >= ret[ret.length - 1][key] )
				ret.push(item); // first item after fillers or cur item gte last item of ret
			else {
				for( let i = fillers; i < idx; i++ ) {
					if( item[key] < ret[i][key] ) {
						ret.splice(i, 0, item);
						break;
					}
				}
			}
		}
		return ret;
  };
}])
.filter('pTreeSetFilteredList', [ 'pTreeSelectSvc', function(pTreeSelectSvc) {
	return function(input, ctx) {
		if( ! input || ! input.length ) return input; // can happen during init when provided a Promise
		ctx.setFilteredList(input);
		return input;
  };
}])
.filter('pTreeGapLookup', [ 'pTreeSelectSvc', function(pTreeSelectSvc) {
	// This one is only used for the gapLookup of a righty.
	// It needs to be run after the righty has been run through the 'normal'
	// filter process, because it is well possible that a righty contains 
	// non-matching items which would cause the lefty's gapNode to be shown,
	// but if all those non-matching nodes are filtered out by some outside
	// selected filter we still do not want to show the gapNode on the lefty.
	// Assumptions:
	// - The gapNode should be shown independent of the righty's 'context.filter' 
	// because the filter can change anytime.
	// - Ideally the lookupCache of all righties should only be cleared upon move
	// in the case when the selection has changed. Doing it just with a selection change
	// might be too aggressive because the user could revert the selection back to what
	// it was before scrolling.
	// - This filter needs to run first to reduce the number of filter potentially required runs.
	return function(input, lefty, svc) {
		console.log('gapLookup called with lefty ' + lefty.name);
		if( ! lefty.gapLookup || lefty.lookupCached ) return input;
		var righty = svc.righty();
		console.log('gapLookup righty ' + (righty ? righty.name : 'null'));
		var showGapNode = righty && !!svc.relationshipsFilter(righty.items, true, righty, 1).length;
		// A loop is probably safer, but starting with this...
		var gapItem = input[svc.cfg.offsetY];
		// unfiltered can be first
		if( ! gapItem.__noMatch ) gapItem = input[svc.cfg.offsetY + 1];
		if( gapItem.__noMatch ) {
			gapItem.__hidden = !showGapNode;
		} else {
			console.error('Panic, __noMatch item not found!');
		}
		return input;
	};
}])
.filter('pTreeLast', [ function() {
	return function(input, svc, ctx) {
		if( ! input || ! input.length ) return input; // can happen during init when provided a Promise
		ctx.cachedFilter = ctx.filter; // lookupCache needs to be skipped if the filter has changed
		if( ! svc.cfg.debug ) ctx.lookupCached = true;
		return input;
  };
}]);
