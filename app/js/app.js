(function() {
    'use strict';

    var app = angular.module('corpusweb', [
        'ui.bootstrap',
        'ngRoute',
        'ngMaterial'
    ]);

    app.config(['$routeProvider',
        function($routeProvider) {
            $routeProvider.
            when('/', {
                templateUrl: 'partials/search-list.html',
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

    app.controller('QueryController', ['$scope', '$http',
        function($scope, $http) {
            $scope.queryTerm = '';
            $scope.totalItems = 0;
            $scope.currentPage = 1;
            $scope.numPerPage = 10;
            var ids = new Array();
            var begin = 0;
            var end = 0;

            // Load the graph
            sigma.parsers.gexf(
                '../../data/COP21.gexf', {
                    container: 'carto',
                    settings: {
                        defaultEdgeColor: '#d3d3d3',
                        edgeColor: '#d3d3d3'
                    }
                },
                function(s) {
                    s.graph.nodes().forEach(function(n) {
                        n.color = '#707070';
                    });
                    s.refresh();
                    $scope.sig = s;
                }
            );

            $scope.search = function() {
                begin = ($scope.currentPage - 1) * 10;
                end = begin + $scope.numPerPage;
                $http.get('../data/COP21.csv').success(function(data) {
                    $scope.allResults = $.csv.toObjects(data).slice(1);
                    $scope.results = $scope.allResults.filter(function(item) {
                        return item.NAME.includes($scope.queryTerm);
                    });
                    $scope.totalItems = $scope.results.length;
                    $scope.results = $scope.results.slice(begin, end);
                    $scope.results.forEach(function(result) {
                        result.url = result['START PAGES'].split(' ').concat(result['PREFIXES'].split(' ')).filter(function(item) {
                            return item;
                        })[0];
                    });
                    // Aggregate all the ids of the selected nodes
                    ids = $scope.results.map(function(item) {
                        return item.ID;
                    });
                    if (!$scope.queryTerm) {
                        // Reset all nodes' color to the default one
                        $scope.sig.graph.nodes().forEach(function(n) {
                            n.color = '#707070';
                        });
                    } else {
                        // Reset all nodes' color to the light grey
                        $scope.sig.graph.nodes().forEach(function(node) {
                            node.color = '#d3d3d3';
                        });
                        // Color selected nodes into red
                        $scope.sig.graph.nodes().forEach(function(node) {
                            if (ids.indexOf(node.id) != -1) node.color = '#e6142d';
                        });
                    }
                    $scope.sig.refresh();
                });
            }

            // Initiate the search results
            $scope.search();
        }
    ]);
})();