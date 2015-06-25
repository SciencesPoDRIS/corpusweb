(function() {
    'use strict';

    var app = angular.module('webcorpus', [
        'webcorpus.conf',
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
            var filter;

            /* Center the whole graph */
            $scope.sigmaCenter = function() {
                var c = $scope.graph.cameras[0]
                c.goTo({
                    ratio: 1,
                    x: 0,
                    y: 0
                })
            }

            /* Zoom on the graph */
            $scope.sigmaZoom = function() {
                var c = $scope.graph.cameras[0]
                c.goTo({
                    ratio: c.ratio / c.settings('zoomingRatio')
                })
            }

            /* Unzoom on the graph */
            $scope.sigmaUnzoom = function() {
                var c = $scope.graph.cameras[0]
                c.goTo({
                    ratio: c.ratio * c.settings('zoomingRatio')
                })
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
                        // Initialize the Sigma Filter API
                        filter = new sigma.plugins.filter(s);
                        $scope.graph = s;
                        // Open modal on click on a node of the graph
                        $scope.graph.bind('clickNode', function(e) {
                            $scope.viewEntity(e.data.node.attributes);
                        });
                        // On node hover, color all the connected edges in the node color
                        $scope.graph.bind('overNode', function(n) {
                            // Get the connected edges
                            $scope.graph.graph.edges().forEach(function(e) {
                                if (e.source == n.data.node.id || e.target == n.data.node.id) {
                                    e.color = n.data.node.color;
                                    e.zindex = 1;
                                } else {
                                    e.zindex = 0;
                                }
                            });
                            $scope.graph.refresh();
                            // Simulate mouse hover effect on the tiles
                            $('#' + n.data.node.id + ' img').addClass('hover');
                        });
                        // On node out, reset all edges color to the default one
                        $scope.graph.bind('outNode', function(n) {
                            $scope.graph.graph.edges().forEach(function(e) {
                                e.color = '#d3d3d3';
                            });
                            $scope.graph.refresh();
                            $('#' + n.data.node.id + ' img').removeClass('hover');
                        });
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
                console.log('filter');
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
                /* Filter nodes displayed on the graph */
                filter.nodesBy(function(n) {
                    return ids.indexOf(n.id);
                }).apply();
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