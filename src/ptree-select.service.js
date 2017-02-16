(function () {
'use strict';

function context(data, cfg, cnt) {
	angular.extend(this, cfg, data);
	this.curY = 0; // to maintain a per items-list position throughout the session
	this.cnt = cnt; // an increment for the moves to identify where we are in the contexts list...
	this.pages = 1;
	this.selectPages = 1;
	this.filter = '';
	this.itemsToShow = this.pageSize; // pageSize * pages
	this.selectToShow = this.pageSize; // pageSize * pages
	this._name = this.displayField; // which data field is displayed, uniqued by and ordered by
	this.fillItems();
	this.filteredList = this._items; // updated by the setFilteredList Filter, used in scrollUp/scrollDown; looks super ugly, HELPME
	this.focus = this.items[0]; // needed for the showIf filter...
	this.keepFocus = false; // used by enter() and moveRight() below, just put here for documentation
	this.lookupCached = false;
	this.lookupCache = null; // used by the pTreeItems filter; just put here for documentation
	this.prevFocus; // used to flush the righties' lookupCache on leave if focus has changed
	this.moved = 0; // see reset() below
	this.topLevelShared = true; // see toggleResultItem below
	this.lastOther = null; // see relationshipsFilter
	this.__selectCnt = 0; // for 'show more' efficiency
}

context.prototype = {
	scrollUp: function() {
		if( this.curY + this.offsetY + 1 < this.filteredList.length ) {
			this.curY++;
			this.focus = this.filteredList[this.curY + this.offsetY];
			return true;
		}
		return false;
	},
	scrollDown: function() {
		if( this.curY > 0 ) {
			this.curY--;
			this.focus = this.filteredList[this.curY + this.offsetY];
			return true;
		}
		return false;
	},
	fillItems: function() {
		// HELPME: This needs to be done here actively; the limitTo filters are not fired upon changes on the context values, why?
		// filler is set to signal any filter that those ones are to be kept (or not)...
		// unfiltered is used by the relationships filter to recognize if no item has been selected yet...
		this._items = ' '.repeat(this.offsetY - this.curY < 0 ? 0 : this.offsetY - this.curY).split('').reduce((prev, cur) => { prev.push({ __id: prev.length, [this._name]: '', __filler: true, __ignore: true }); return prev; }, []).concat(this.items);
		// The order of the following helper items matter because they are addressed by offset from within some filters!
		if( this.unfiltered ) this._items.splice(this.offsetY, 0, { __id: 'unfiltered', __filler: true, __unfiltered: true, [this._name]: this.unfilteredName });
		this._items.splice(this.offsetY, 0, { __id: 'empty', __filler: true, __empty: true, __hidden: true, [this._name]: this.emptyName }); // nothing found
		// on movable groups insert a *none* item that becomes visible if there are holes in the data
		// noMatch is used to tell the righties that a 'noMatch' item has been selected on one of the lefties so that the correct ones are listed
		// __selectable is used as flag to the resultMap function
		if( this.movable ) this._items.splice(this.offsetY, 0, { [this.itemKey]: '__ptree-noMatch', __selectable: true, [this.selectKey]: false, __id: 'none', __filler: true, __noMatch: true, __hidden: true, [this._name]: this.noneName });
	},
	setFilteredList: function(list) {
		this.filteredList = list;
	},
	enter: function() {
		// called by $watch when shifted left or right in case the filters have changed 
		if( ! this.filteredList ) return; // init
		// After a moveRight the new lefty's (previous righty) focused item should remain the same as before.
		// Otherwise the lookupCache gets out of sync. This happens exactly down here when curY gets changed.
		// The alternative would be to refresh both lefty and righty filters upon move which sounds complicated.
		this.prevFocus = this.focus; // to be able to compare them upon leave
		var offsetY = this.offsetY; // see below why
		// to see if curY is still in range and to refresh the focus with what is on curY
		if( this.focus && ( this.keepFocus || this.curY + this.offsetY >= this.filteredList.length ) ) {
			this.keepFocus = false;
			// i can get < 0 in selection inherit mode where the __filler items are not injected - FIXME
			for( var i = this.filteredList.length - 1; i >= 0 && this.focus[this._name] !== this.filteredList[i][this._name] && !( this.filteredList[i].__filler && ! this.filteredList[i].__hidden ); i-- ) {}
			this.curY = i - this.offsetY;
			if( this.curY < 0 ) this.curY = 0; // this happens if the for loop above finds no match which happens after a move when the list has changed
			// below can happen in selection inherit mode, remember in this mode the __filler items are not injected - FIXME
			if( this.curY + this.offsetY >= this.filteredList.length ) offsetY = 0;
		}
		this.focus = this.filteredList[this.curY + offsetY];
	},
	leave: function(svc) {
		if( this.focus !== this.prevFocus ) svc.invalidateLookupCache();
	},
	invalidateLookupCache: function() {
		this.lookupCached = false;
	},
	showMore: function() {
		this.itemsToShow = this.pageSize * ++this.pages;
	},
	selectShowMore: function() {
		this.selectToShow = this.pageSize * ++this.selectPages;
	},
	filterChange: function() {
		// Not so sure here, of course the list needs to be re-positioned on a filter change
		// but could it be done more efficiently somehow
		this.curY = 0;
	},
	reset: function(svc, moveRight) {
		// run on moves and if Escape is pressed
		this.curY = 0;
		if( this.filter.length ) this.filter = '';
		else {
			this.pages = 1;
			this.itemsToShow = this.pageSize;
			this.selectToShow = this.pageSize;
		}
		this.focusFilterElement(false);
		svc.invalidateLookupCache(moveRight ? 2 : 1);
		// calling enter() here because upon a move the context.name does not change
		// which is usually not a problem but only when the leftmost righty gets moved to the left and if it was empty before
		// then the focus will remain undefined until enter is called which is enforced here
		// NOT calling enter() here directly because it would be called too early, before the filters are run
		// Therefore delaying it with this...
		this.moved++;
	},
	invalidateLookupCache: function() {
		this.lookupCached = false;
	},
	isLookupCached: function() {
		return this.lookupCached;
	},
	hasFocusChanged: function() {
		return this.focus !== this.prevFocus;
	},
	getResultItem: function(key) {
		return this.resultMap ? this.resultMap[key] : null;
	},
	toggleResultItem: function(key, svc, forceLoop, idx) {
		// The loop is required because remember we group by displayField and therefore all items that share that key
		// need to be changed.
		// However this is only required on the lefty the user triggers. In the recursive calls this can be skipped because
		// the 'selection-lookup' does not perform this grouping.
		// In addition we have to distinguish two cases:
		// - If a resultItem is toggled on a list that has focus we have to distinguish between these two cases:
		//   - if a list contains a shart key and is the leftmost lefty of that group of shared keys, then the toggle is applied to all items that share
		//     the same displayField
		//   - otherwise the toggle is only applied to the very item which was selected
		// - However if a user clicks on a result-preview-item we clear all that share the same displayField
		//   because we cannot know the user's intention (therefore the forceLoop parameter).
		//   Technically we could identify (based on ctx.focus) which on was derived from the current selection, but it seems more natural
		//   at least now if we apply the loop in this case.
		//
		// forceLoop is set upon a mouse click on one of the result previews. This can be anywhere right to the current lefty
		// (because the result list is only shown right to the current lefty).
		// To make the propagation work we need to have the offset from the lefty set correctly.
		// Therefore upon forceLoop we need to figure out the current offset from current and pass it as depth.
		// That's why idx has been introduced to be able to figure out the clicked list's index.
		var trigger = this.resultMap[key];
		if( ! trigger ) return console.error('Panic, no resultMap entry for key ' + key + ' found');
		var toggledValue = !trigger[this.selectKey];
		var savedFocus = this.focus;
		var offset = forceLoop ? idx - svc.cfg.offsetX : 0;
		for( let resultKey of Object.keys(this.resultMap) ) {
			let resultItem = this.resultMap[resultKey];
			if( resultItem[this._name] === trigger[this._name] && ( forceLoop || this.topLevelShared || resultItem === trigger ) ) {
				this.focus = resultItem;
				this._toggleResultItem(resultKey, svc, toggledValue, offset); // we have to pass the value here already because of the item grouping we can have mixed values
			}
		}
		this.focus = savedFocus;
	},
	_toggleResultItem: function(key, svc, value, depth) { // value is set by ctx.propagateSelection() and by toggleResultItem() above
		// We must not completely skip not-selectable lists for the sandwich case (see comment in propagateInherit() below).
		if( ! this.selectable && value === undefined ) return console.error('Panic, cannot toggle resultItem selection on not-selectable list ' + this.name);
		if( ! this.resultMap ) return console.error('Panic, no resultMap on selectable context ' + this.name);
		// if no key exists it is supposed to be the noMatch node
		if( key && ! this.resultMap[key] ) return console.error('Panic, no key ' + key + ' in resultMap on selectable context ' + this.name);
		value = value !== undefined ? value : key ? !this.resultMap[key][this.selectKey] : undefined;
		if( this.selectable && key ) this.resultMap[key][this.selectKey] = value;
		if( this.selectMode === 'inherit' ) svc.propagateSelection(this, key ? this.resultMap[key][this._name] : null, value, depth || 0);
	},
	flushSelection: function() {
		if( ! this.selectable ) return;
		for( let item of this.items ) {
			if( item.__filler ) continue;
			item[this.selectKey] = false;
		}
	},
	hasSelected: function() {
		for( let key of Object.keys(this.resultMap) ) {
			if( this.resultMap[key][this.selectKey] && ! this.resultMap[key].__filler ) return true;
		}
		return false;
	},
	getSelected: function() {
		var ret = [];
		for( let key of Object.keys(this.resultMap) )
			if( this.resultMap[key][this.selectKey] && ! this.resultMap[key].__filler ) ret.push(this.resultMap[key]);
		this.__selectCnt = ret.length; // for 'show more' efficiency
		return ret;
	},
	setDraggedGroup: function(grp) {
		// this is used by dragenter and dragover to see if the dragged element belongs to the same item group
		// this is necessary because these events have no access to the dataTransfer data
		// see http://stackoverflow.com/questions/28487352/dragndrop-datatransfer-getdata-empty
		this.draggedGroup = grp;
	},
	getDraggedGroup: function() {
		return this.draggedGroup;
	},
	setFilterElement: function(element) {
		this.filterElement = element;
	},
	focusFilterElement: function(truthy) {
		if( truthy === false ) {
			this.filterElement.removeClass('forcefocused');
			this.filterElement[0].blur();
		} else {
			this.filterElement.addClass('forcefocused');
			// HELPME: Why does this require a second '/' keypress event (also $timeout does not help)?
			this.filterElement[0].focus();
		}
	}
};

/* @ngInject */
function pTreeSelectSvc() {
	function pTreeClass(cfg) {
		var that = this;
		this.defaults = { offsetX: 2, offsetY: 2, pageSize: 8, group: undefined, unfiltered: false, unfilteredName: '* UNFILTERED *', noneName: '* NONE *', gapLookup: false, displayField: 'name', foreignKey: 'name', emptyName: '* EMPTY *', keyboardCtrl: true, selectable: false, itemKey: 'id', selectKey: '__selected', isolated: false, selectMode: 'inherit' };
		this.cfg = cfg;
		for( var def in this.defaults ) {
			if( this.cfg[def] === undefined ) this.cfg[def] = this.defaults[def];
		}
		this.curX = 0; // where within listChannel
		this.contexts = [];
		this.pointers = {};
		this.listChannel = [];
	}
	pTreeClass.prototype = {
		init: function(data, result) {
			this.data = data;
			if( ! result ) result = this.contexts;
			for( let i = 0; i < data.length; i++ ) {
				this.contexts[i] = new context(data[i], this.cfg, i);
				if( this.pointers[data[i].name] ) console.error('Oops, the list names should be unique; ' + data[i].name + ' seems to appear more often than just once.');
				this.pointers[data[i].name] = this.contexts[i];
			}
			// If it turns out that the whole idea of having distinct result sets as to be too slow,
			// we can just remove it again and just use an inline result attribute, which can be accessed directly.
			//
			// result can be an empty array or a prefilled result set or null/undefined in which case it is
			// referenced to the data object.
			// Providing the option of keeping the result distinct from the data offers the possibility
			// to have 'diffs'.
			for( let ctx of this.contexts ) {
				// We have to create the resultMap also for not-selectable lists in case when a not-selectable list is between
				// two selectable lists in inheritence mode. In this case the not-selectable list must still be able to
				// 'forward' the selection to its (selectable) righty.
				// if( ! ctx.selectable ) continue;
				// this map is used to have direct access to the result items (in case they are out of order
				// alternatively they could be ordered in the same way as the ctx's items are
				ctx.resultMap = {};
				let ctxidx;
				for( ctxidx = result.length; ctxidx--; )
					if( result[ctxidx].name === ctx.name ) break;
				if( ctxidx === -1 ) {
					let resultList = [];
					result.push({ name: ctx.name, items: resultList });
					for( let item of ctx._items ) {
						if( item.__filler && ! item.__selectable ) continue; // the noMatch __filler gets a pseudo-result item
						let resultItem = null;
						if( item.__filler ) // noMatch
							resultItem = { [ctx.itemKey]: item[ctx.itemKey], [ctx._name]: item[ctx._name], get [ctx.selectKey] () {
								let key = this.context.lastOther ? this.context.lastOther[this.context.itemKey] : 'noOther';
								console.log('getting ' + key);
								return !!this.selectMap[key];
							}, set [ctx.selectKey] (val) {
								let key = this.context.lastOther ? this.context.lastOther[this.context.itemKey] : 'noOther';
								console.log('setting ' + key + ' = ' + val);
								this.selectMap[key] = val;
							}, __filler: true, __noMatch: item.__noMatch, context: ctx, selectMap: {} };
						else
							resultItem = { [ctx.itemKey]: item[ctx.itemKey], [ctx._name]: item[ctx._name], [ctx.selectKey]: !!item[ctx.selectKey] }; 
						// if( item.__filler ) resultItem.__filler = true; // the fillers are not wanted in the result preview lists
						if( ! item.__filler ) resultList.push(resultItem); // the noMatch item is not added to the resultList
						ctx.resultMap[item[ctx.itemKey]] = resultItem;
					}
				} else { // this could be done in the loop above as well, just for readability
					for( let item of result[ctxidx]._items ) {
						let resultItem = null;
						if( item.__filler && item.__selectable ) {
							if( item.__filler ) // noMatch
								resultItem = { [ctx.itemKey]: item[ctx.itemKey], [ctx._name]: item[ctx._name], get [ctx.selectKey] () {
									let key = this.context.lastOther ? this.context.lastOther[this.context.itemKey] : 'noOther';
									console.log('getting ' + key);
									return !!this.selectMap[key];
								}, set [ctx.selectKey] (val) {
									let key = this.context.lastOther ? this.context.lastOther[this.context.itemKey] : 'noOther';
									console.log('setting ' + key + ' = ' + val);
									this.selectMap[key] = val;
								}, __filler: true, __noMatch: item.__noMatch, context: ctx, selectMap: {} };
							else
								resultItem = { [ctx.itemKey]: item[ctx.itemKey], [ctx._name]: item[ctx._name], [ctx.selectKey]: !!item[ctx.selectKey] }; 
							// if( item.__filler ) resultItem.__filler = true; // the fillers are not wanted in the result preview lists
							ctx.resultMap[item[ctx.itemKey]] = resultItem;
						} else if( ! item.__filler )
							ctx.resultMap[item[ctx.itemKey]] = item;
					}
				}
			}
			// introducing one abstraction layer here to be able to support both inline and extra result data
			// if this is too costly during init we could switch to lazy initialization instead
			this.resultMap = {};
			for( let list of result ) {
				if( ! list.selectable ) continue;
				this.resultMap[list.name] = {};
				for( let item of list._items ) {
					if( ! item[list.itemKey] ) continue; // skip the __filler pseudo items
					this.resultMap[list.name][item[list.itemKey]] = item;
				}
			}
			this.refreshLists();
			return this.getContext();
		},
		getCurX: function() {
			return this.curX;
		},
		getLists: function() {
			return this.listChannel;
		},
		getContext: function() {
			// only called initially once
			// return this.contexts[0];
			// now also called after scrolling and for various filters...
			return this.listChannel[this.curX + this.cfg.offsetX];
		},
		righty: function(offset) { // offset used by recursive propagateSelection()
			if( ! offset ) offset = 0;
			return this.listChannel[this.curX + this.cfg.offsetX + offset + 1];
		},
		lefty: function() {
			return this.listChannel[this.curX + this.cfg.offsetX - 1];
		},
		refreshLists: function() {
			var that = this;
			this.listChannel.splice(0, this.listChannel.length);
			this.listChannel.push.apply(this.listChannel, ' '.repeat(this.cfg.offsetX).split('').reduce((prev, cur) => { prev.push({ __id: prev.length }); return prev; }, []))
			this.listChannel.push.apply(this.listChannel, this.contexts.reduce(function(prev, ctx) {
				if( ! ctx.showIf || Object.keys(ctx.showIf).every(function(k) {
					var pNameKey = that.pointers[k]._name;
					return( that.pointers[k] && that.pointers[k].focus[pNameKey] === ctx.showIf[k] );
				}) ) prev.push(ctx);
				return prev;
			}, []));
		},
		invalidateLookupCache: function(offset) {
			// offset is used on a moveRight to invalidate the moved item's and the new lefty's cache as well
			if( ! offset ) offset = 0;
			// IMPROVEME: Should this be done only for related lists?
			for( var cnt = this.listChannel.length - 1; cnt > this.curX + this.cfg.offsetX - offset; cnt-- ) {
				this.listChannel[cnt].invalidateLookupCache();
			}
		},
		scrollLeft: function() {
			if( this.curX ) {
				this.getContext().leave(this);
				this.curX--;
			}
			return this.getContext();
		},
		scrollRight: function() {
			if( this.curX + this.cfg.offsetX !== this.listChannel.length - 1 ) {
				this.getContext().leave(this);
				this.curX++;
			}
			return this.getContext();
		},
		scrollUp: function() {
			if( this.listChannel[this.curX + this.cfg.offsetX].scrollUp() ) this.refreshLists();
		},
		scrollDown: function() {
			if( this.listChannel[this.curX + this.cfg.offsetX].scrollDown() ) this.refreshLists();
		},
		moveByMouse: function(dragData, tgtIndex) {
			// there is no plausibility checking done here - that's done by the event handlers
			// opposite to the keyboard moves below we simply resort and clear the selection from the lowest cnt (moved left or right) on
			// curX is not changed - that's intentionally done to keep the users' focus
			if( dragData.index === tgtIndex ) return;
			var movedItem = this.contexts.splice(dragData.index, 1)[0];
			this.contexts.splice(tgtIndex, 0, movedItem);
			this.refreshContextCounters(); // remove me once the cnt bug below is fixed
			this.refreshLists();
			var ctx = this.getContext(); // can be different if we dropped onto the current context item moving left
			ctx.reset(this);
			this.flushSelection(dragData.index > tgtIndex ? movedItem : this.contexts[dragData.index]);
			return ctx;
		},
		moveLeft: function(scope) {
			var context = this.getContext(), contexts = this.contexts, myX = context.cnt, leftCtx = this.listChannel[this.curX + this.cfg.offsetX - 1];
			if( ! context.movable ) return context;
			if( leftCtx.group !== context.group ) return context;
			contexts.splice(myX, 1);
			// below's usage of cnt is buggy because it assumes no holes in the list which can happen anytime, use $index instead - FIXME
			// refreshContextCounters() can be removed then
			contexts.splice(leftCtx.cnt, 0, context);
			this.refreshContextCounters();
			this.curX--;
			context.reset(this);
			this.refreshLists();
			this.flushSelection(context);
			return context;
		},
		moveRight: function(scope) {
			var context = this.getContext(), contexts = this.contexts, myX = context.cnt, RightCtx = this.listChannel[this.curX + this.cfg.offsetX + 1];
			if( ! context.movable ) return context;
			if( ! RightCtx || RightCtx.group !== context.group ) return context;
			contexts.splice(myX, 1);
			// below's usage of cnt is buggy because it assumes no holes in the list which can happen anytime, use $index instead - FIXME
			// refreshContextCounters() can be removed then
			contexts.splice(RightCtx.cnt, 0, context); // contexts is one less now, so the rightCtx.cnt works...
			RightCtx.keepFocus = true; // see ctx.enter()
			this.refreshContextCounters();
			this.curX++;
			context.reset(this, true);
			this.refreshLists();
			this.flushSelection(this.lefty());
			return context;
		},
		refreshContextCounters: function() {
			for( var i = 0, context = null; context = this.contexts[i]; i++ ) {
				context.cnt = i;
			}
		},
		flushSelection: function(ctx) {
			// parameter ctx is the ctx object to start from (down to the right)
			// we have to be careful; up to now the functions expected to work on the current context (curX)
			// but with the dragging and dropping this changes because with the mouse you can move a list
			// from any position to any position
			// and even wih keyboard control only on a moveRight the flush needs to start on the new node's lefty
			// therefore curX cannot be used here
			var startGrp = ctx.name, found = false;
			for( let list of this.contexts ) {
				if( list === ctx ) found = true;
				if( found ) {
					if( startGrp !== list.name && list.isolated ) return;
					list.flushSelection();
				}
			}
		},
		// propagateInherit: function(ctx, nameValue, value, depth)
		propagateSelection: function(ctx, nameValue, value, depth) {
			var righty = this.righty(depth);
			if( ! righty ) return;
			if( ctx.group !== righty.group && righty.isolate ) return;
			if( ctx.hasFocusChanged() ) this.invalidateLookupCache();
			// if nameValue is null it is considered to be the noMatch item
			// but inside relationshipsFilter the righty is already an offset of 1 from the current context
			var rightyItems = this.relationshipsFilter(righty.items, !nameValue, righty, depth + 1);
			// if no items were found, put the righty's gapItem in the list
			// this is okay, in case there are noMatch items on the righty's righty then the propagation will work,
			// if not nothing happens and we are done
			// if( ! rightyItems.length ) rightyItems.push(righty.items[this.cfg.offsetY + 1]);
			// adding them always if existing because noMatches can exist if the list is empty or not
			if( righty.gapLookup ) rightyItems.push(righty._items[this.cfg.offsetY]);
			// lookupCache needs to be checked indepedent of focusChange because we can be
			// in a recursion when the focusChange returns all green
			if( ! righty.isLookupCached() ) {
				// This is a bit of a design flaw maybe!
				// Instead of calling the filters one by one in the ng-repeat we should either all or some of them combine in a bigger filter
				// which can be called from code as well, and that filter should take care of the filteredList and call to enter internally
				// instead of having to hack them here.
				// On the other hand, the rightyItems are needed in any case. So that big filter should also maintain another list on each
				// ctx containing all matching items before unique them, just for the purpose of the selection.
				righty.setFilteredList(rightyItems);
				righty.enter();
			}
			righty.invalidateLookupCache(); // only part of the filters have run, and filteredList is potentially dirty, so enforce a clean run on next enter
			for( let item of rightyItems ) {
				righty.focus = item; // for the recursion, so that the next righty filters properly
				righty._toggleResultItem(item[righty.itemKey], this, value, depth + 1);
			}
		},
/*
		propagateCrossProduct: function(ctx, nameValue, value, depth) {
			if( ! ctx.selectable || ! nameValue ) return; // in cross-product mode it is safe to return if not selectable
			for( let resultKey of Object.keys(ctx.resultMap) ) {
				let resultItem = ctx.resultMap[resultKey];
				if( resultItem[ctx._name] === nameValue ) ctx.toggleResultItem(resultItem[ctx.itemKey], this, value, true);
			}
		},
		propagateSelection: function(ctx, nameValue, value, depth) {
			if( ! depth ) depth = 0;
			if( ctx.selectMode === 'inherit' ) this.propagateInherit(ctx, nameValue, value, depth);
			else if( ctx.selectMode === 'cross-product' ) this.propagateCrossProduct(ctx, nameValue, value, depth);
			else console.error('Panic, unknown selectMode ' + ctx.selectMode + ' on context ' + ctx.name);
		},
*/
		/**
		* Parameters
		* noMatch - positive or negative match required
		* item - the current item that is checked
		* other - the list against which the match happens
		* otherListName - the name of the list against which the match happens
		* nameKey - the key of the other list's items' displayField
		* defaultForeignKey - the default item key to use for foreignKey queries
		* relationships - the foreignKeyRelationships object
		*/
		filterForeignMatch: function(noMatch, item, other, otherListName, nameKey, defaultForeignKey, relationships) {
			return ! noMatch && ( ( relationships && ! relationships[otherListName] ) || ! item[otherListName] || item[otherListName].indexOf(other.focus[relationships && relationships[otherListName] ? relationships[otherListName] : defaultForeignKey]) > -1 ) ||
				noMatch && ! ( ( relationships && ! relationships[otherListName] ) || ! item[otherListName] || item[otherListName].indexOf(other.focus[relationships[otherListName] || defaultForeignKey]) > -1 );
		},
		filterSharedMatch: function(noMatch, item, other, otherListName, nameKey, defaultForeignKey, relationships, ctx) {
			ctx.topLevelShared = false;
			ctx.lastOther = other.focus;
			/**
			* These loops are necessary because other is grouped by <key> (unique) so we have to loop to see if other contains more items
			* with the same <key>-value and compare them as well!
				return oitem[nameKey] !== other.focus[nameKey] && oitem[relationships[otherListName]] === item[relationships[otherListName]];
			*/
			return ( ! noMatch && ( ! relationships || ! relationships[otherListName] || other._items.some(function(oitem) {
				return oitem[nameKey] === other.focus[nameKey] && oitem[relationships[otherListName]] === item[relationships[otherListName]];
			}) ) ) || ( noMatch && ! ( ! relationships || ! relationships[otherListName] || other._items.some(function(oitem) {
				return ( oitem[nameKey] !== undefined && oitem[relationships[otherListName]] === item[relationships[otherListName]] );
			}) ) );
		},
		/**
			* Filter by relationships.
			* Remember the implicit foreignKeyFilter:
			* Ptree implicitly checks the lists of all lefties if they appear in current's items' objects.
			* This can be overridden by explicitly defining a foreignKeyRelationships object and turned off
			* completely by leaving that object empty.
			*
			* ctx is optional and is used in 'lookahead cases' like nomatch checks and selection propagation
			* offset is optional as well; this is used usually in conjunction with the lookaheads and propagations
			* when the context different from the current context
			* FIXME: If the context object contained the Xoffset it could be used directly for all types of loops
			* and the offsetX + curX + offset could be saved and simplified by just context.offset.
			*
			* lastOther
			* This is ugly. The noMatch item of selectable lists should also show whether it is selected or not.
			* The thing is that with movable lists you do not have the notion of a parent.
			* If there was a fixed parent we could just remember the status of the noMatch items per parent.
			* Therefore lastOther is the attempt to remember the current pseudo-parents id and map the corresponding
			* selected state to it.
			*
			* Partially selected items
			* With fixed parents it is easy to identify if all righties of a specific item are selected or only
			* parts of them. In our case with the movable lists this is not possible easily. One brute force
			* solution would be to scan all matching righty items which would be expensive for big lists.
			* At the moment there is no support to for a specific color to denote partially selected righties.
			* If this is required once, lastOther can be used for this probably.
		*/
		relationshipsFilter: function(input, _noMatch, ctx, offset) {
			if( ! ctx ) ctx = this.getContext();
			var ret = input, tmp = [], that = this;
			if( ! offset ) offset = 0;
			ctx.topLevelShared = true;
			ctx.lastOther = null;

			for( var i = this.cfg.offsetX, other = null; i < this.curX + this.cfg.offsetX + offset; i++ ) {
				other = this.listChannel[i];
				// this if statement is just to skip fast if irrelevant
				// skipping is possible only if both relationship types are irrelevant
				if( ( ! ctx.foreignKeyRelationships || ctx.foreignKeyRelationships[other.name] ) ||
					( ctx.sharedKeyRelationships && ctx.sharedKeyRelationships[other.name] ) ) {
					if( ! other.focus ) {
						console.error('Panic, other.focus not set!');
						return [];
					}
					if( other.focus.__unfiltered || other.focus.__empty ) continue;
					// no need to check 'movable' here because this is done before already
					// noMatch needs to be set in two cases:
					// - other.focus.__noMatch === true => in this case all righties that refer other in their relationships need to follow noMatch
					// - _noMatch is specified in the arguments in which case only the direct lefty counts as this is only a look-ahead for the direct righty
					let noMatch = ( _noMatch && i === this.curX + this.cfg.offsetX + offset - 1) || other.focus.__noMatch;
					ret.every(function(item) { // switched from forEach to every to support the fast-exit done in _noMatch mode
						// items that do not contain the _name field are skipped - this is done to help the directive's user not having to do the filtering on their side
						if( item[ctx._name] === undefined ) return;
						// if _noMatch is set the caller just wants to see if there are any non-matching 'real' items, so the __fillers are ignored in this case
						if( item.__filler && ! _noMatch ) return tmp.push(item);
						if( ctx.sharedKeyRelationships && ctx.sharedKeyRelationships[other.name] 
							? that.filterSharedMatch(noMatch, item, other, other.name, other._name, ctx.foreignKey, ctx.sharedKeyRelationships, ctx)
							: that.filterForeignMatch(noMatch, item, other, other.name, other._name, ctx.foreignKey, ctx.foreignKeyRelationships)
						) tmp.push(item);
						return !( _noMatch && noMatch ) || ! tmp.length; // this is just to exit as fast as possible if in look-ahead mode
					});
					ret = tmp;
					tmp = [];
				}
			}
			return ret;
		},
		setFilterElement: function(listname, element) {
			for( let ctx of this.contexts )
				if( ctx.name === listname ) return ctx.setFilterElement(element);
		}
	};
	var instance;
	return {
		create: function(data, cfg) { instance = new pTreeClass(data, cfg); return instance; },
	};
}

angular
	.module('pTreeSelect')
	.factory('pTreeSelectSvc', [ pTreeSelectSvc ]);
})();
