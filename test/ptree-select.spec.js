/*
 * Two more potential design flaws detected:
 *   In test mode the ng-repeat filters are not called.
 *   1. Would it be better to do the filtering and all inside the service instead of using ng-repeat filters?
 *   2. Even if we stay with this concept, wouldn't it be better to put all filters inside one function to make
 *      it easier to call the filters from various places?
 *   The consequence of this is that the ng-repeat filters need to be kept in sync with the filters called here inside the tests.
 *   Check /src/ptree-select-main.jade for the list of currently used filters.
*/

describe('ptree-select', function () {
	'use strict';

	function prepareData(data) {
		let items = data.splice(2, 1)[0].items;
		for( let att of [ 'name', 'species', 'color', 'legs', 'age' ] ) {
			let newList = {
				name: att,
				group: 'Pets',
				movable: true,
				selectable: true,
				gapLookup: !!(att === 'legs'),
				unfilteredName: att === 'legs' ? "no legs" : null,
				items: items,
				displayField: att,
				sharedKeyRelationships: {
					"name": "id",
					"species": "id",
					"color": "id",
					"legs": "id",
					"age": "id"
				}
			};
			if( [ 'name', 'species' ].indexOf(att) === -1 )
				newList.showIf = { Details: 'all' };
			data.push(newList);
		}
		return data;
	}

	function filter(items, context, svc) {
    items = $filter('pTreeGapLookup')(items, context, svc);
    items = $filter('pTreeFilter')(items, context.filter);
		items = $filter('pTreeItems')(items, svc, context);
		items = $filter('filter')(items, {__hidden:'!true'});
		items = $filter('pTreeOrderBy')(items, context._name);
		items = $filter('pTreeUnique')(items, context._name);
		items = $filter('pTreeSetFilteredList')(items, context);
		items = $filter('pTreeLimitTo')(items, context.itemsToShow, context.curY);
		items = $filter('pTreeLast')(items, svc, context);
		return items;
	}

  var pTreeSelectSvc, $filter, svc, ctx, lists;
	var filterElement = [ { blur: function() {}, focus: function() {} } ];
	filterElement.addClass = function() {};
	filterElement.removeClass = function() {};

  beforeAll(function(){
    fixture.setBase('sample');
    fixture.load('ptree-data.json');
	});
	// HELPME: when replaced with beforeAll the tests fail, but why?
  beforeEach(module('pTreeSelect'));
  beforeEach(inject(function(_pTreeSelectSvc_){
    pTreeSelectSvc = _pTreeSelectSvc_;
  }));
  beforeEach(inject(function(_$filter_){
    $filter = _$filter_;
  }));

  it("tests if the fixture is loaded", function () {
		expect(fixture.json[0]).toBeDefined();
		expect(fixture.json[0][0].name).toEqual('Details');
	});

	it('should initialize the tree', function () {
		var data = prepareData(fixture.json[0]);
		svc = pTreeSelectSvc.create({});
		ctx = svc.init(data, []);
		lists = svc.getLists();
		expect(ctx.name).toEqual('Details');
		filter(ctx._items, ctx, svc);
		expect(ctx.focus.name).toEqual('all');
	});	

	it('should scroll up to "few"', function() {
		svc.scrollUp();
		expect(ctx.focus.name).toEqual('few');
		svc.refreshLists();
		expect(lists.length).toBe(6);
	});

	it('should scroll down to "all"', function() {
		svc.scrollDown();
		expect(ctx.focus.name).toEqual('all');
		svc.refreshLists();
		expect(lists.length).toBe(9);
	});

	it('should scroll right to "All of them"', function() {
		ctx = svc.scrollRight();
		filter(ctx._items, ctx, svc);
		ctx.enter();
		expect(ctx.focus.name).toEqual('All of them');
	});

	it('should scroll up to "Aunt Sally"', function() {
			svc.scrollUp();
		expect(ctx.focus.name).toEqual('Aunt Sally');
	});

	it('should scroll right once more to "Nemo"', function() {
		ctx = svc.scrollRight();
		filter(ctx._items, ctx, svc);
		ctx.enter();
		expect(ctx.focus.name).toEqual('Nemo');
	});

	it('should swap "species" with "name" simulating a drag and drop action', function() {
		var species = svc.righty();
		species.setFilterElement(filterElement);
		ctx.setFilterElement(filterElement);
		ctx = svc.moveByMouse({ index: species.cnt, group: species.group }, ctx.cnt);
		filter(ctx._items, ctx, svc);
		ctx.enter();
		expect(ctx.focus.species).toEqual('cat');
	});

});
