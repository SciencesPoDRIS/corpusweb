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
            var actorsTypes = new Array();
            var ids = new Array();
            var begin = 0;
            var end = 0;

            // #TODO : Put it into a config file
            $scope.actorsTypes = [
                {
                    id: 'blogger',
                    name: 'Blogger',
                    isSelected: true,
                    color: '#D7DF60'
                },
                {
                    id: 'institution',
                    name: 'Institution',
                    isSelected: true,
                    color: '#E8B0D8'
                },
                {
                    ID: 'association/non-profit organization',
                    name: 'Association/non-profit organization',
                    isSelected: true,
                    color: '#7AE0B2'
                },
                {
                    id: 'initiative',
                    name: 'Initiative',
                    isSelected: true,
                    color: '#ECAC68'
                },
                {
                    id: 'think tank',
                    name: 'Think tank',
                    isSelected: true,
                    color: '#F1A49E'
                },
                {
                    id: 'NGO',
                    name: 'NGO',
                    isSelected: true,
                    color: '#7EDADC'
                },
                {
                    id: 'activist',
                    name: 'Activist',
                    isSelected: true,
                    color: '#B4C5E3'
                },
                {
                    id: 'research institution',
                    name: 'Research institution',
                    isSelected: true,
                    color: '#ABE18C'
                },
                {
                    id: 'other',
                    name: 'Other',
                    isSelected: true,
                    color: '#D6C571'
                }
                // {
                //     id : 'academic',
                //     name: 'Academic',
                //     isSelected : true,
                //     color: ''
                // },
                // {
                //     id : 'agency',
                //     name: 'Agency',
                //     isSelected : true,
                //     color: ''
                // },
                // {
                //     id : 'company',
                //     name: 'Company',
                //     isSelected : true,
                //     color: ''
                // },
                // {
                //     id : 'event',
                //     name: 'Event',
                //     isSelected : true,
                //     color: ''
                // },
                // {
                //     id : 'governmental project',
                //     name: 'Governmental project',
                //     isSelected : true,
                //     color: ''
                // },
                // {
                //     id : 'journalist',
                //     name: 'Journalist',
                //     isSelected : true,
                //     color: ''
                // },
                // {
                //     id : 'media',
                //     name: 'Media',
                //     isSelected : true,
                //     color: ''
                // },
                // {
                //     id : 'political_party',
                //     name: 'Political party',
                //     isSelected : true,
                //     color: ''
                // },
                // {
                //     id : 'politician',
                //     name: 'Politician',
                //     isSelected : true,
                //     color: ''
                // },
                // {
                //     id : 'polling_institute',
                //     name: 'Polling Institute',
                //     isSelected : true,
                //     color: ''
                // },
                // {
                //     id : 'research project',
                //     name: 'Research project',
                //     isSelected : true,
                //     color: ''
                // },
                // {
                //     id : 'trade_union',
                //     name: 'Trade union',
                //     isSelected : true,
                //     color: ''
                // },
                // {
                //     id : 'university',
                //     name: 'University',
                //     isSelected : true,
                //     color: ''
                // }
            ];

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
                jQuery.each($scope.actorsTypes, function(index, item) {
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
                // Color selected nodes into red
                $scope.graph.graph.nodes().forEach(function(node) {
                    if (ids.indexOf(node.id) != -1) {
                        node.color = $scope.actorsTypes.filter(function(item) {return item.id == node.attributes["type d'acteur"]})[0].color;
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
            // #TODO : Put it into a config file
            ga('create', 'UA-63565327-1', 'auto');
            ga('send', 'pageview');
        });
    });
})();