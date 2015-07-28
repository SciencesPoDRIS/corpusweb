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
            when('/WebEntity/:webEntityId', {
                templateUrl: 'partials/web-entity.html',
                controller: 'WebEntityCtrl'
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

    app.controller('QueryController', ['categories', '$scope', '$http', '$modal',
        function(categories, $scope, $http, $modal) {
            // Init variables
            var ids = new Array();
            var begin = 0;
            var end = 0;
            var filter;
            var searchCriteria;
            var result;
            var tmp;

            // Init scope variables
            $scope.queryTerm = '';
            $scope.totalItems = 0;
            $scope.currentPage = 1;
            $scope.numPerPage = 12;

            // Load all categories to display
            $scope.categories = new Array();
            $.each(categories, function(index, item) {
                if (item.isDiplayed !== undefined && item.isDiplayed) {
                    $scope.categories.push(item);
                }
            });

            // Center the whole graph
            $scope.sigmaCenter = function() {
                var c = $scope.graph.cameras[0]
                c.goTo({
                    ratio: 1,
                    x: 0,
                    y: 0
                })
            }

            // Zoom on the graph
            $scope.sigmaZoom = function() {
                var c = $scope.graph.cameras[0]
                c.goTo({
                    ratio: c.ratio / c.settings('zoomingRatio')
                })
            }

            // Unzoom on the graph
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
                            $scope.graph.graph.edges().forEach(function(e, i) {
                                if (e.source == n.data.node.id || e.target == n.data.node.id) {
                                    e.color = n.data.node.color;
                                    // Remove edge from edges array
                                    $scope.graph.graph.dropEdge(e.id);
                                    // Add edge as last element of edges array (to render it at the top of other edges)
                                    $scope.graph.graph.addEdge(e);
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
                        $http.get('../data/COP21.tsv').success(function(data) {
                            $scope.allResults = [];
                            $.each(data.split('\n').slice(1), function(index, item) {
                                item = item.split('\t');
                                tmp = {};
                                tmp['ID'] = item[0];
                                tmp['NAME'] = item[1];
                                tmp['PREFIXES'] = item[2];
                                tmp['URL'] = item[3];
                                tmp['STATUS'] = item[4];
                                tmp['INDEGREE'] = item[5];
                                tmp['FULL_NAME'] = item[6];
                                tmp['ACTORS_TYPE'] = item[7];
                                tmp['COUNTRY'] = item[8];
                                tmp['AREA'] = item[9];
                                tmp['ANTHROPOGENIC_CLIMATE_CHANGE'] = item[10];
                                tmp['MITIGATION_ADAPTATION'] = item[11];
                                tmp['INDUSTRIAL_DELEGATION'] = item[12];
                                tmp['THEMATIC_DELEGATION'] = item[13];
                                tmp['LANGUAGE'] = item[14];
                                tmp['COLLECTION'] = item[15];
                                tmp['ABSTRACT_DRAFT'] = item[16];
                                tmp['ABSTRACT'] = item[17];
                                tmp['COMMENT'] = item[18];
                                $scope.allResults.push(tmp);
                            });
                            $scope.filter();
                        });
                    }
                );
            }

            /* *
             * Return true if the node matches the search criteria, else return false
             * @var node 
             * @var searchCriteria JSONobject
             * 
             * @return boolean
             * */
            var isSearchedAmongCriteria = function(searchCriteria, node) {
                result = true;
                $.each(searchCriteria, function(index, item) {
                    result = result && (item.indexOf(node[categories[index].mappedField]) >= 0);
                });
                return result;
            }

            // Filter the results on the search criteria
            $scope.filter = function(id, obj) {
                // If initial load, do nothing
                if (id !== undefined) {
                    // If the 'all' checkbox is checked, check all the checkboxes of the group
                    // If the 'all' checkbox is unchecked, unchek all the checkboxes of the group
                    if (obj == 'all') {
                        $.each(categories[id].values, function(index, item) {
                            item.isSelected = $('input#' + obj + '[name="' + id + '"]').prop('checked');
                        });
                        // If another checkbox is checked
                    } else {
                        // If another checkbox is checked and if all the checkboxes but the 'all' one are checked, check the 'all' one
                        if ($('input#' + obj + '[name="' + id + '"]').prop('checked')) {
                            if ($('input[name="' + id + '"]:checked:not("#all")').length == categories[id].values.length - 1) {
                                categories[id].values.filter(function(item) {
                                    return item.id == 'all';
                                })[0].isSelected = true;
                            }
                            // If another checkbox is unchecked, uncheck the 'all' checkbox
                        } else {
                            categories[id].values.filter(function(item) {
                                return item.id == 'all';
                            })[0].isSelected = false;
                        }
                    }
                }
                // Create JSON object to encapsulate the search criteria
                searchCriteria = {};
                $.each(categories, function(index_01, item_01) {
                    if (item_01.values !== undefined) {
                        searchCriteria[index_01] = [];
                        $.each(item_01.values, function(index_02, item_02) {
                            if (item_02.isSelected) {
                                searchCriteria[index_01].push(item_02.id);
                            }
                        });
                    }
                });
                ids = new Array();
                $scope.currentPage = 1;
                $scope.filteredResults = $scope.allResults.filter(function(item) {
                    if ((
                            // Check if the searched term is present into the name of the site or into the actors' type of the site
                            (item.FULL_NAME.toLowerCase().indexOf($scope.queryTerm.toLowerCase()) >= 0) || (item.INDUSTRIAL_DELEGATION.toLowerCase().indexOf($scope.queryTerm.toLowerCase()) >= 0) || (item.THEMATIC_DELEGATION.toLowerCase().indexOf($scope.queryTerm.toLowerCase()) >= 0) || (item.ABSTRACT.toLowerCase().indexOf($scope.queryTerm.toLowerCase()) >= 0))
                        // Check if the actors' type is present into the actors' type searched
                        && isSearchedAmongCriteria(searchCriteria, item)
                    ) {
                        ids.push(item.ID);
                        return true;
                    } else {
                        return false;
                    }
                });
                // Filter nodes displayed on the graph
                filter.nodesBy(function(n) {
                    return ids.indexOf(n.id);
                }).apply();
                $scope.totalItems = $scope.filteredResults.length;
                $scope.display();
            }

            // Filter the results to display the current page according to pagination
            $scope.display = function() {
                begin = ($scope.currentPage - 1) * 10;
                end = begin + $scope.numPerPage;
                $scope.displayedResults = $scope.filteredResults.slice(begin, end);
                $scope.graph.graph.nodes().forEach(function(node) {
                    // Reset all nodes' color to the light grey
                    node.color = '#d3d3d3';
                    // Change default label by the value of the column "FULL_NAME"
                    node.label = node.attributes.FULL_NAME;
                });
                // Color only selected nodes, according to the configuration file
                $scope.graph.graph.nodes().forEach(function(node) {
                    if (ids.indexOf(node.id) != -1) {
                        node.color = categories[categories.nodesColor].values.filter(function(item) {
                            return item.id == node.attributes[categories[categories.nodesColor].mappedField];
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

            // Add effect on scroll to fix the search bar
            $(document).scroll(function() {
                if (!$('.search').hasClass('searchfix') && $(document).scrollTop() > $('.corpus-snippet').height()) {
                    $('.search').addClass('searchfix');
                } else if ($('.search').hasClass('searchfix') && $(document).scrollTop() == 0) {
                    $('.search').removeClass('searchfix');
                }
            });
        }
    ]);

    app.controller('ModalInstanceCtrl', ['$scope', '$modalInstance', 'item',
        function($scope, $modalInstance, item) {
            $scope.item = item;
            $scope.close = function() {
                $modalInstance.close();
            };
        }
    ]);

    app.controller('WebEntityCtrl', ['$scope', '$routeParams', '$http',
        function($scope, $routeParams, $http) {
            // Load corpus
            $http.get('../data/COP21.csv').success(function(data) {
                var webEntities = $.csv.toObjects(data).slice(1);
                for (var i = 0; i < webEntities.length; i++) {
                    if (webEntities[i].ID == $routeParams.webEntityId) {
                        $scope.webEntity = webEntities[i];
                    }
                }
            });
        }
    ]);

    app.filter('translateActorsType', ['categories',
        function(categories, input) {
            return function(input) {
                var index = 0;
                while(categories.actorsTypesCollection.values[index].id != input) {
                    index++;
                }
                return categories.actorsTypesCollection.values[index].name;
            };
        }
    ]);

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