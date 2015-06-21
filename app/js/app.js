(function() {
    'use strict';

    var app = angular.module('corpusweb', [
        'corpusweb.conf',
        'ui.bootstrap',
        'ngRoute',
        'ngMaterial',
        'elasticsearch'
    ]);

    app.config(['$routeProvider',
        function($routeProvider) {
            $routeProvider.
            when('/', {
                templateUrl: 'partials/search-entities.html',
                controller: 'QueryController'
            }).
            when('/description/', {
                templateUrl: 'partials/description.html',
                controller: 'CorpusCtrl'
            }).
            otherwise({
                redirectTo: '/'
            });
        }
    ]);

    app.controller('CorpusSnippetCtrl', ['$scope', 'loadCorpora',
        function($scope, loadCorpora) {
            loadCorpora.getCorpora().then(function(data) {
                $scope.corpus = data[0];
            });
        }
    ]);

    app.controller('CorpusCtrl', ['$scope', '$sce', 'loadCorpora',
        function($scope, $sce, loadCorpora) {
            loadCorpora.getCorpora().then(function(data) {
                $scope.corpus = data[0];
                $scope.purpose = $sce.trustAsHtml(data[0].purpose);
                $scope.selection = $sce.trustAsHtml(data[0].selection);
                $scope.indexing = $sce.trustAsHtml(data[0].indexing);
                $scope.footnote = $sce.trustAsHtml(data[0].footnote);
            });
        }
    ]);

    app.controller('QueryController', ['actorsTypesCollection', '$scope', '$http', '$modal', 'es', 'elasticSearchIndex',
        function(actorsTypesCollection, $scope, $http, $modal, es, elasticSearchIndex) {
            $scope.queryTerm = '';
            $scope.totalItems = 0;
            $scope.currentPage = 1;
            $scope.numPerPage = 12;
            $scope.actorsTypesCollection = actorsTypesCollection;
            var actorsTypes = new Array();
            var ids = new Array();
            var begin = 0;
            var end = 0;

            $scope.retrieveFacets = function() {
                es.search({
                    index: elasticSearchIndex,
                    size: 10,
                    body: {
                        "aggs": {
                            "indegree": {
                                "terms": {
                                    "field": "indegree"
                                }
                            },
                            "crawling status": {
                                "terms": {
                                    "field": "crawling status"
                                }
                            }
                        }
                    }
                }).then(function(response) {
                    $scope.facets = new Array();
                    // Format facets as an array of JSON objects
                    $.each(response.aggregations, function(item, value) {
                        var o = new Object();
                        o.name = item;
                        o.values = value.buckets;
                        // Select all item of all factes by default
                        $.each(o.values, function(i, v) {
                            v.selected = true;
                        });
                        // Filter all facets that have only one different value
                        if(value.buckets.length > 1) {
                            $scope.facets.push(o);
                        }
                    });
                });
            }

            $scope.init = function() {
                // Load the graph
                sigma.parsers.gexf(
                    '../data/COP21.gexf', {
                        container: 'graph',
                        settings: {
                            defaultEdgeColor: '#d3d3d3',
                            edgeColor: 'default',
                            labelThreshold: 100
                        }
                    },
                    function(s) {
                        $scope.graph = s;
                        // Open modal on click on a node of the graph
                        $scope.graph.bind('clickNode', function(e) {
                            $scope.viewEntity(e.data.node.attributes);
                        });
                        // On node hover, color in red all the connected edges
                        $scope.graph.bind('overNode', function(n) {
                            // Get the connected edges
                            $scope.graph.graph.edges().forEach(function(e) {
                                if (e.source == n.data.node.id || e.target == n.data.node.id) {
                                    e.color = '#e6142d';
                                }
                            });
                            $scope.graph.refresh();
                        });
                        // On node out, reset all edges color to the default one
                        $scope.graph.bind('outNode', function(e) {
                            $scope.graph.graph.edges().forEach(function(e) {
                                e.color = '#d3d3d3';
                            });
                            $scope.graph.refresh();
                        });
                        $scope.graph.refresh();
                        // Load all facets
                        $scope.retrieveFacets();
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
                $.each(actorsTypesCollection, function(index, item) {
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
                $scope.graph.graph.nodes().forEach(function(node) {
                    // Reset all nodes' color to the light grey
                    node.color = '#d3d3d3';
                    // #TODO : to improve
                    // Change default label by the value of the column "NOM"
                    node.label = node.attributes.NOM;
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

    // Create the es service from the esFactory
    app.service('es', function(esFactory) {
        return esFactory({
            host: 'localhost:9200'
        });
    });

    // Create factory to load the json corpora
    app.factory('loadCorpora', ['$http',
        function($http) {
            return {
                getCorpora: function() {
                    return $http.get('../data/corpora.json').then(function(data) {
                        return data.data.corpora;
                    });
                }
            }
        }
    ]);

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
                for (var i = 0; i < $scope.columnsNumber; i++) {
                    $scope.data[i] = $scope.source.slice(i * elementsByColumn, (i + 1) * elementsByColumn);
                }
                $scope.columnWidth = 12 / $scope.columnsNumber;
            },
            templateUrl: 'partials/graph-legend.html',
            replace: true
        };
    });

})();