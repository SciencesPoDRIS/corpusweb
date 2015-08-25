(function() {
    'use strict';

    /* Directives */

    var app = angular.module('webcorpus.directives', []);

    app.directive('legend', function() {
        return {
            restrict: 'E',
            scope: {
                columnsNumber: '=columnsNumber'
            },
            controller: function($scope, categories) {
                var elementsByColumn = Math.ceil(categories[categories.nodesColor].values.length / $scope.columnsNumber);
                $scope.data = new Array($scope.columnsNumber);
                for (var i = 0; i < $scope.columnsNumber; i++) {
                    $scope.data[i] = categories[categories.nodesColor].values.slice(i * elementsByColumn, (i + 1) * elementsByColumn);
                }
                $scope.columnWidth = 12 / $scope.columnsNumber;
            },
            templateUrl: 'partials/graph-legend.html',
            replace: true
        };
    });

})();