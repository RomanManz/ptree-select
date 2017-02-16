'use strict';

/**
 * @ngdoc function
 * @name angularTestApp.controller:ptree-data
 * @description
 * # Controller
 * Controller to provide sample data for the pTree directive
 */
angular.module('angularTestApp', ['ngResource', 'pTreeSelect'])
  .controller('ptree-data', function ($scope, $resource) {
    $scope.data = $resource('/sample/ptree-data.json').query().$promise.then(function(data) {
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
		});
		$scope.cfg = { debug: true };
		$scope.result = [];
  });
