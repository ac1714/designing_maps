
function ChoroplethMap(elementId) {

    this.divId = elementId;
    this.divSelector = '#' + elementId;

    this.drawMap = function() {

        var map = this;
        var el = document.getElementById(map.divId);

        // Ohio Map Dimensions: 960x1200 (width x height)
        // Use this to scale the map up/down depending on
        // size of map container.
        map.height = el.clientHeight;
        map.width = (960 / 1200) * map.height;
        console.log('Making map size: ' + map.width + 'x' + map.height);

        // For more on map projections, see:
        // https://github.com/mbostock/d3/wiki/Geo-Projections
        map.projection = d3.geo.conicConformal();
        map.path = d3.geo.path().projection(map.projection);

        map.svg = d3.select(map.divSelector).append('svg')
            .attr('width', map.width)
            .attr('height', map.height);

        map.bg = map.svg.append('g');
        map.fg = map.svg.append('g');

        map.drawState().then(function() {
            map.drawCounties().then(function() {
                map.setScale('YlGn');
                map.setRange(9);
                map.colorCounties();
            });
        });

        d3.select('#scaleSelect').on('change', function() {
            map.setScale(this.value);
        });
        d3.select('#rangeSelect').on('change', function() {
            map.setRange(this.value);
        });
    };

    this.colorCounties = function() {
        var map = this;

        d3.tsv('data/unemployment.oh.tsv', function(error, response) {
            map.rates = {};
            console.log('Re-coloring counties. Range: ' + map.range);
            var extent = d3.extent(response, function(d, i) {
                return d.rate;
            });

            var scale = d3.scale.quantize()
                .domain(extent)
                .range(d3.range(map.range).map(function(i) {
                    return "q" + i + "-" + map.range; })
                );

            var len = response.length;
            var i, d, q, id, fips;
            for (i = 0; i < len; i++) {
                d = response[i];
                q = scale(d.rate);
                fips = d.county_id.substring(2); // remove the 39 from the front
                id = '#county_' + fips
                d3.select(id)
                    .attr('class', 'county')
                    .classed(q, true);
                map.rates[fips] = d.rate;
            }
            map.drawLegend(extent);
        });
    };

    this.drawLegend = function(extent) {
        var boxSize = 20;
        var map = this;
        d3.select('#legend-ctr').html('');

        var legend = d3.select('#legend-ctr')
            .append('svg')
            .attr('id', 'legend')
            .attr('class', map.oldScale)
            .attr('width', boxSize * 2)
            .attr('height', boxSize * map.range);

        legend.selectAll('rect')
            .data(d3.range(map.range))
            .enter().append('rect')
            .attr('width', boxSize * 2)
            .attr('height', boxSize)
            .attr('x', 0)
            .attr('y', function(d, i) {
                return boxSize * i;
            })
            .attr('class', function(d, i) {
                return 'q' + i + '-' + map.range;
            });
    };

    this.setScale = function(newScale) {
        var map = this;
        if (this.oldScale) {
            map.bg.classed(this.oldScale, false);
            d3.select('#legend').classed(this.oldScale, false);
        }
        this.oldScale = newScale;
        map.bg.classed(newScale, true)
        d3.select('#legend').classed(newScale, true);
    };

    this.setRange = function(newRange) {
        this.range = newRange;
        this.colorCounties();
    }

    this.handleHover = function(d, i) {
        var map = this;
        var fips = d.properties['FIPS_CODE'];
        var rate = Math.round(map.rates[fips] * 100);
        d3.select('#countyname').html(d.properties['COUNTY_NAM']);
        d3.select('#unemploymentval').html(rate);
    };

    this.drawState = function() {
        var deferred = $.Deferred();
        var map = this;
        d3.json('maps/state.oh.json', function(error, response) {

            // Since we picked the conicConformal projection, we need to also
            // rotate the map so our map doesn't look funky.
            var centroid = d3.geo.centroid(response.features[0]);
            var r = [centroid[0] * -1, centroid[1] * -1];
            // Start the projection from defaults (looking at Ohio)
            map.projection.scale(1).translate([0, 0]).rotate(r);

            var b = map.path.bounds(response),
                s = 0.95 / Math.max((b[1][0] - b[0][0]) / map.width, (b[1][1] - b[0][1]) / map.height),
                t = [(map.width - s * (b[1][0] + b[0][0])) / 2, (map.height - s * (b[1][1] + b[0][1])) / 2];

            map.projection.scale(s).translate(t);

            map.fg.selectAll('path')
                .data(response.features)
                .enter().append('path')
                .attr('class', 'state')
                .attr('d', map.path);

            deferred.resolve();
        });

        return deferred.promise();
    };

    this.drawCounties = function() {
        // use promises since d3.json is async
        var deferred = $.Deferred();

        var map = this;
        d3.json('maps/county.oh.json', function(error, response) {
            map.counties = response.features;
            map.bg.selectAll('path')
                .data(map.counties)
                .enter().append('path')
                .attr('id', function(d) {
                    return 'county_' + d.properties['FIPS_CODE'];
                })
                .attr('class', 'county')
                .attr('d', map.path)
                .on('mouseover', function(d, i) {
                    map.handleHover(d, i);
                });
            deferred.resolve();
        });

        return deferred.promise();
    };

}; // ChoroplethMap
