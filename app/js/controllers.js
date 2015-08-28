(function() {

    'use strict';

    /* Controllers */

    var app = angular.module('webcorpus.controllers', []);

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

    app.controller('QueryController', ['categories', '$scope', '$http',
        function(categories, $scope, $http) {
            // Init variables
            var ids = [],
                begin = 0,
                end = 0,
                filter,
                searchCriteria,
                result,
                tmp;

            // Init scope variables
            $scope.queryTerm = '';
            $scope.totalItems = 0;
            $scope.currentPage = 1;
            $scope.numPerPage = 12;
            

            // Load all categories to display
            $scope.categories = [];
            $.each(categories, function(index, item) {
                if (item.isDiplayed !== undefined && item.isDiplayed) {
                    $scope.categories.push(item);
                }
            });

            // Default entities view as grid
            $scope.view = 'grid';

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

            // Hide or display the search filters
            $scope.moreFilters = function() {
                if ($scope.filtersCollapsed) {
                    $('.category-value').removeClass('hide');
                    $('.btn-more-filters').html('Less filters');
                    $scope.filtersCollapsed = false;
                } else {
                    $('.category').each(function(index) {
                        $(this).find('.category-value').slice(3).addClass('hide');
                    });
                    $('.btn-more-filters').html('More filters');
                    $scope.filtersCollapsed = true;
                }
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
                        // Count number of results by facets
                        // Iterate over nodes from the graph
                        $scope.graph.graph.nodes().forEach(function(node) {
                            // Iterate over categories
                            $.each(categories, function(item, value) {
                                if (value.id) {
                                    categories[value.id].values.filter(function(item) {
                                        if (item.id == node.attributes[value.mappedField]) {
                                            item.count++;
                                            return true;
                                        } else if (item.id == 'all') {
                                            item.count = $scope.graph.graph.nodes().length;
                                        }
                                    });
                                }
                            })
                        });
                        // Display only the first three facets items, hide the other ones
                        $('.category').each(function(index) {
                            $(this).find('.category-value').slice(3).addClass('hide');
                            $scope.filtersCollapsed = true;
                        });
                        // Open web entity page on click on a node of the graph
                        $scope.graph.bind('clickNode', function(e) {
                            window.location.href = '/app/#/WebEntity/' + e.data.node.id;
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
                ids = [];
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

    app.controller('WebEntityCtrl', ['$scope', '$routeParams', '$http', 'categories',
        function($scope, $routeParams, $http, categories) {
            // Init variables
            var filter;

            // Load corpus
            $http.get('../data/COP21.tsv').success(function(data) {
                $.each(data.split('\n').slice(1), function(index, item) {
                    item = item.split('\t');
                    if (item[0] == $routeParams.webEntityId) {
                        $scope.webEntity = {};
                        $scope.webEntity.ID = item[0];
                        $scope.webEntity.NAME = item[1];
                        $scope.webEntity.PREFIXES = item[2];
                        $scope.webEntity.URL = item[3];
                        $scope.webEntity.STATUS = item[4];
                        $scope.webEntity.INDEGREE = item[5];
                        $scope.webEntity.FULL_NAME = item[6];
                        $scope.webEntity.ACTORS_TYPE = item[7];
                        $scope.webEntity.COUNTRY = item[8];
                        $scope.webEntity.AREA = item[9];
                        $scope.webEntity.ANTHROPOGENIC_CLIMATE_CHANGE = item[10];
                        $scope.webEntity.MITIGATION_ADAPTATION = item[11];
                        $scope.webEntity.INDUSTRIAL_DELEGATION = item[12];
                        $scope.webEntity.THEMATIC_DELEGATION = item[13];
                        $scope.webEntity.LANGUAGE = item[14];
                        $scope.webEntity.COLLECTION = item[15];
                        $scope.webEntity.ABSTRACT_DRAFT = item[16];
                        $scope.webEntity.ABSTRACT = item[17];
                        $scope.webEntity.COMMENT = item[18];
                    }
                });
            });

            $scope.backToCorpus = function() {
                window.location.href = '/app/#/';
            }

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

            // Add a method to the graph model that returns an
            // object with every neighbors of a node inside
            if (!sigma.classes.graph.hasMethod('neighbors')) {
                sigma.classes.graph.addMethod('neighbors', function(nodeId) {
                    var k,
                        neighbors = {},
                        index = this.allNeighborsIndex[nodeId] || {};
                    for (k in index)
                        neighbors[k] = this.nodesIndex[k];
                    return neighbors;
                });
            };

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
                    // Color only selected nodes, according to the configuration file
                    var node = $.grep($scope.graph.graph.nodes(), function(item, index) {
                        return item.id == $routeParams.webEntityId;
                    })[0];
                    var color = $.grep(categories.actorsType.values, function(item, index) {
                        return item.id == node.attributes.ACTORS_TYPE;
                    })[0].color;
                    var ids = [];
                    ids.push($routeParams.webEntityId);
                    $.each($scope.graph.graph.neighbors($routeParams.webEntityId), function(item, index) {
                        ids.push(item);
                    });
                    $scope.graph.graph.nodes().forEach(function(node) {
                        if ((ids.indexOf(node.id) != -1) && (node.attributes[categories[categories.nodesColor].mappedField] !== undefined)) {
                            node.color = categories[categories.nodesColor].values.filter(function(item) {
                                return item.id == node.attributes[categories[categories.nodesColor].mappedField];
                            })[0].color;
                        }
                    });
                    // Color the connected edges
                    $scope.graph.graph.edges().forEach(function(e, i) {
                        if (e.source == $routeParams.webEntityId || e.target == $routeParams.webEntityId) {
                            e.color = color;
                            // Remove edge from edges array
                            $scope.graph.graph.dropEdge(e.id);
                            // Add edge as last element of edges array (to render it at the top of other edges)
                            $scope.graph.graph.addEdge(e);
                        }
                    });
                    $scope.graph.refresh();
                }
            );
        }
    ]);

})();