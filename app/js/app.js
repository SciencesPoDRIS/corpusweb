(function() {
    'use strict';

    var app = angular.module('corpusweb', [
        'corpusweb.conf',
        'ui.bootstrap',
        'ngRoute',
        'ngMaterial'
    ]);

    app.config(['$routeProvider',
        function($routeProvider) {
            $routeProvider.
            when('/', {
                templateUrl: 'partials/search-entities.html',
                controller: 'QueryController'
            }).
            when('/description', {
                templateUrl: 'partials/description.html',
                controller: 'CorpusCtrl'
            }).
            otherwise({
                redirectTo: '/'
            });
        }
    ]);

    app.controller('CorpusSnippetCtrl', ['$scope', '$http',
        function($scope, $http) {
            $http.get('../data/corpora.json').success(function(data) {
                $scope.corpus = data.corpora[0];
            });
        }
    ]);

    app.controller('CorpusCtrl', ['$scope', '$http',
        function($scope, $http) {
            $http.get('../data/corpora.json').success(function(data) {
                $scope.corpus = data.corpora[0];
            });
        }
    ]);

    app.controller('QueryController', ['actorsTypesCollection', '$scope', '$http', '$modal',
        function(actorsTypesCollection, $scope, $http, $modal) {
            $scope.queryTerm = '';
            $scope.totalItems = 0;
            $scope.currentPage = 1;
            $scope.numPerPage = 12;
            $scope.actorsTypesCollection = actorsTypesCollection;
            var actorsTypes = new Array();
            var ids = new Array();
            var begin = 0;
            var end = 0;

            $scope.init = function() {
                // Load the graph
                sigma.parsers.gexf(
                    '../data/COP21.gexf', {
                        container: 'graph',
                        settings: {
                            defaultEdgeColor: '#d3d3d3',
                            edgeColor: '#d3d3d3',
                            labelThreshold: 100
                        }
                    },
                    function(s) {
                        $scope.graph = s;
                        $scope.graph.refresh();
                        // Load all results
                        $http.get('../data/COP21.csv').success(function(data) {
                            $scope.allResults = $.csv.toObjects(data).slice(1);
                            $scope.filter();
                        });
                    }
                );
            }

            /* Filter the results on the query term */
            $scope.filter = function() {
                actorsTypes = new Array();
                jQuery.each(actorsTypesCollection, function(index, item) {
                    if (item.isSelected) {
                        actorsTypes.push(item.id);
                    }
                });
                ids = new Array();
                $scope.currentPage = 1;
                $scope.filteredResults = $scope.allResults.filter(function(item) {
                    if (((item.NOM.toLowerCase().indexOf($scope.queryTerm.toLowerCase()) >= 0) || (item["type d'acteur"].toLowerCase().indexOf($scope.queryTerm.toLowerCase()) >= 0)) && (actorsTypes.indexOf(item["type d'acteur"]) >= 0)) {
                        ids.push(item.ID);
                        return true;
                    } else {
                        return false;
                    }
                });
                $scope.totalItems = $scope.filteredResults.length;
                $scope.display();
            }

            /* Filter the results to display the current page according to pagination */
            $scope.display = function() {
                begin = ($scope.currentPage - 1) * 10;
                end = begin + $scope.numPerPage;
                $scope.displayedResults = $scope.filteredResults.slice(begin, end);
                // Reset all nodes' color to the light grey
                $scope.graph.graph.nodes().forEach(function(node) {
                    node.color = '#d3d3d3';
                });
                // Color only selected nodes
                $scope.graph.graph.nodes().forEach(function(node) {
                    if (ids.indexOf(node.id) != -1) {
                        node.color = actorsTypesCollection.filter(function(item) {
                            return item.id == node.attributes["type d'acteur"]
                        })[0].color;
                    }
                });
                $scope.graph.refresh();
            }

            $scope.viewEntity = function(item) {
                var modalInstance = $modal.open({
                    animation: true,
                    templateUrl: 'entity',
                    controller: 'ModalInstanceCtrl',
                    size: 'lg',
                    resolve: {
                        item: function() {
                            return item;
                        }
                    }
                });
            }

            $scope.init();
        }
    ]);

    app.controller('ModalInstanceCtrl',
        function($scope, $modalInstance, item) {
            $scope.item = item;
            $scope.close = function() {
                $modalInstance.close();
            };
        }
    );

    app.run(function(googleAnalyticsId, $rootScope, $location) {
        $rootScope.$on('$routeChangeSuccess', function() {
            ga('create', googleAnalyticsId, 'auto');
            ga('send', 'pageview');
        });
    });

    app.directive('legend', function() {
        return {
            restrict: 'E',
            scope: {
                source: '=',
                columnsNumber: '=columnsNumber'
            },
            controller: function($scope) {
                var elementsByColumn = Math.ceil($scope.source.length / $scope.columnsNumber);
                $scope.data = new Array($scope.columnsNumber);
                for(var i = 0; i < $scope.columnsNumber; i++) {
                    $scope.data[i] = $scope.source.slice(i * elementsByColumn, (i + 1) * elementsByColumn);
                }
                $scope.columnWidth = 12 / $scope.columnsNumber;
            },
            templateUrl: 'partials/graph-legend.html',
            replace: true
        };
    });

})();