'use strict';

angular.module('pTreeSelect')
.directive('pTree', [ '$window', 'pTreeSelectSvc', function($window, pTreeSelectSvc) {
	function link(scope, elem, attrs) {
		/**
		 * The context is needed for two reasons on this level:
		 * - So that the y-Axis knows which fields to display.
		 * - So that the filtering based on the keydown events works.
		*/
		angular.element($window).on('keydown', function(event) {
			var preventDefault = true;
			console.log(event.code);
			if( event.code === 'ArrowUp' ) scope.$apply(function() { scope.svc.scrollUp(); });
			else if( event.code === 'ArrowDown' ) scope.$apply(function() { scope.svc.scrollDown(); });
			else if( event.code === 'ArrowLeft' && scope.controlKey ) scope.$apply(function() { scope.context = scope.svc.moveLeft(); });
			else if( event.code === 'ArrowRight' && scope.controlKey ) scope.$apply(function() { scope.context = scope.svc.moveRight(); });
			else if( event.code === 'ArrowLeft' ) scope.$apply(function() { scope.context = scope.svc.scrollLeft(); });
			else if( event.code === 'ArrowRight' ) scope.$apply(function() { scope.context = scope.svc.scrollRight(); });
			else if( event.code === 'Escape' ) scope.$apply(function() { scope.context.reset(scope.svc); });
			else if( event.code === 'Space' ) scope.$apply(function() { scope.context.toggleResultItem(scope.context.focus[scope.context.itemKey], scope.svc); });
			else if( event.code === 'Slash' ) scope.$apply(function() { scope.context.focusFilterElement(); });
/*
			else if( ( event.code.startsWith('Key') || event.code.startsWith('Digit') ) && scope.context.filter !== undefined && ! scope.context.filter.length ) {
				preventDefault = false;
				scope.$apply(function() {
					scope.context.filter = String.fromCharCode(event.keyCode);
				});
			}
*/
			else return scope.controlKey = event.code === 'ControlLeft';
			scope.controlKey = event.code === 'ControlLeft';
			if( preventDefault ) event.preventDefault();
		});
		scope.svc = pTreeSelectSvc.create(scope.pTreeCfg || {});
		scope.lists = scope.svc.getLists();
		scope.context = {};
		new Promise(function(resolve, reject) {
			resolve(scope.pTreeData);
		}).then(function(data) {
			scope.$apply(function() { scope.context = scope.svc.init(data, scope.pTreeResult); });
		});
		// This needs to be done here because at this stage the filters have been refreshed already and so the curY can be checked.
		scope.$watch('context.name', function(newValue, oldValue) {
			if( ! newValue ) return; // during init
			scope.context.enter();
			// IMPROVE: review the scrollLeft/scrollRight code to see if other stuff could be done here as well (and maybe the filters as well)
		});
		// Upon a move the name does not necessarily change (if done through the keyboard), therefore enforcing an enter here with this counter
		scope.$watch('context.moved', function(newValue, oldValue) {
			if( ! newValue ) return; // during init
			scope.context.enter();
			// IMPROVE: review the scrollLeft/scrollRight code to see if other stuff could be done here as well (and maybe the filters as well)
		});
	}
	return {
		restrict: 'E',
		scope: { pTreeData: '=', pTreeCfg: '=', pTreeResult: '=' },
		templateUrl: '/src/ptree-select.main.html',
		link: link
	};
}])
.directive('pTreeList', [ function() {
	return {
		restrict: 'E',
		templateUrl: '/src/ptree-select.list.html'
	};
}])
.directive('pTreeFilter', [ '$timeout', function($timeout) {
	function link(scope, elem, attrs) {
		scope.$watch('list.filter', function(val, oldval) {
			if( val === undefined ) return; // during init; throws errors for the __filler elements if val is not checked (because filterChange is missing there)
			if( val === oldval ) return; // this happens after a scrolling for the freshly entered elements, not sure though, why...
			scope.list.filterChange();
		});
/*
		scope.$watch(attrs.ngShow, function(val) {
			// timeout is needed to not fire too quick before the element gets visible even
			// https://coderwall.com/p/a41lwa/angularjs-auto-focus-into-input-field-when-ng-show-event-is-triggered
			// rang the bell
			if( val ) $timeout(function() { elem[0].children[0].focus(); });
		});
*/
		scope.svc.setFilterElement(scope.list.name, elem);
		elem.on('blur', function() {
			scope.context.focusFilterElement(false);
		});
	}
	return {
		restrict: 'A',
		link: link
	};
}])
.directive('pTreeItem', [ function() {
	return {
		restrict: 'E',
		templateUrl: '/src/ptree-select.item.html'
	};
}])
.directive('pTreeDraggable', [ function() {
	function link(scope, elem, attrs) {
		function checkDrop(event) {
			if( scope.context.getDraggedGroup() === scope.list.group ) event.preventDefault();
		}
		elem.on('dragstart', function(event) {
			event.dataTransfer.setData('application/json', JSON.stringify({ index: scope.list.cnt, group: scope.list.group }));
			scope.context.setDraggedGroup(scope.list.group);
		});
		elem.on('dragover', checkDrop);
		elem.on('dragenter', checkDrop);
		elem.on('drop', function(event) {
			scope.$apply(function() { scope.$parent.context = scope.svc.moveByMouse(JSON.parse(event.dataTransfer.getData('application/json')), scope.list.cnt); });
		});
	}
	return {
		restrict: 'A',
		link: link
	};
}]);
