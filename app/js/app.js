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

    app.controller('QueryController', ['$scope', '$http', '$modal',
        function($scope, $http, $modal) {
            $scope.queryTerm = '';
            $scope.totalItems = 0;
            $scope.currentPage = 1;
            $scope.numPerPage = 12;
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
                ids = new Array();
                $scope.currentPage = 1;
                $scope.filteredResults = $scope.allResults.filter(function(item) {
                    if ((item.NOM.toLowerCase().indexOf($scope.queryTerm.toLowerCase()) >= 0) || (item["type d'acteur"].toLowerCase().indexOf($scope.queryTerm.toLowerCase()) >= 0)) {
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
                // Color selected nodes into red
                $scope.graph.graph.nodes().forEach(function(node) {
                    if (ids.indexOf(node.id) != -1) {
                        // #TODO : Put it into a config file
                        switch(node.attributes["type d'acteur"]) {
                            case 'blogueur' :
                                node.color = '#1244dc';
                                break;
                            case 'think tank' :
                                node.color = '#c070ff';
                                break;
                            case 'institution' :
                                node.color = '#c212dc';
                                break;
                            case 'initiative' :
                                node.color = '#12dc44';
                                break;
                            case 'ONG' :
                                node.color = '#c22900';
                                break;
                            case 'entreprise' :
                                node.color = '#ad94ff';
                                break;
                            case 'autre' :
                                node.color = '#c1c1c1';
                                break;
                            case 'expert/chercheur' :
                                node.color = '#dc4512';
                                break;
                            case 'politique' :
                                node.color = '#bdbdbd';
                                break;
                            case 'militant' :
                                node.color = '#1290dc';
                                break;
                            case 'projet gouvernemental' :
                                node.color = '#ff7097';
                                break;
                            case 'projet de recherche' :
                                node.color  = '#b9b9b9';
                                break;
                            case 'association/organisation Ã  but non lucratif' :
                                node.color = '#77dc12';
                                break;
                            case 'institut' :
                                node.color = '#c2dc12';
                                break;
                            default :
                                console.log('Error : no color setted for actor\'s type : ' + node.attributes["type d'acteur"]);
                                break;
                        }
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

    app.run(function($rootScope, $location) {
        $rootScope.$on('$routeChangeSuccess', function() {
            // ga('send', 'pageview', $location.path());
            ga('create', 'UA-63565327-1', 'auto');
            ga('send', 'pageview');
        });
    });
})();