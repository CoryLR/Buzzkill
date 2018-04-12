// Start JS with self-executing anonymous function
(function () {

    // initialize chart properties & expressed
    var [chartWidth, chartHeight, leftPadding, rightPadding, topBottomPadding, chartInnerWidth, chartInnerHeight, translate, yScale, yScaleAxis] = setChartVars();

    // initialize attribute variables
    var [attrArray, attrName, attrDesc, expressed] = prepAttrVars();

    // All other JS contained within this function, started on windowload
    function main() {


        // initialize map properties
        var [width, height, map, path] = prepMapVars();

        // LOAD DATA
        // Load the data & states layer asynchronously (d3.queue is depreciated!)
        // All code gets executed within Promise.all so that the data is available for use
        var csvDataPromise = d3.csv("data/cdc_alcohol_byState.csv")
        var jsonStatesPromise = d3.json("data/ne_states_d3display.topojson")
        Promise.all([csvDataPromise, jsonStatesPromise]).then(function (promiseValues) {

            // unpack the loaded data into variables
            var [csvData, jsonStates] = promiseValues

            // translate states TopoJSON
            var topoJsonStates = topojson.feature(jsonStates, jsonStates.objects.ne_states_d3display).features;

            //join csv data to the topojson
            joinData(csvData, topoJsonStates, attrArray);

            // make map & coordinated visualization
            makeMap(topoJsonStates, map, path, csvData, expressed);

            // Updates the chart & aligns the chart to current domain of attribute
            updateChart(csvData, chartHeight);

            // Creates the dropdown to select an attribute
            createDropdown(attrArray, csvData)

        });

    };



    // ****************
    // HELPER FUNCTIONS
    // ****************

    // initialize variables for creation of the map
    function prepMapVars() {

        //map frame dimensions
        var width = 650,
            height = 420;

        //create new svg container for the map
        var map = d3.select("#mapWrapper")
            .append("svg")
            .attr("class", "map")
            .attr("width", width)
            .attr("height", height);

        //create Albers equal area conic projection centered on France
        var projection = d3.geoAlbers()
            .center([12, 35])

        .scale(800) //        .translate([width / 2, height / 2]);

        var path = d3.geoPath()
            .projection(projection);

        return [width, height, map, path]

    };

    function prepAttrVars() {

        // Attribute acronyms
        var attrArray = ["BDP", "BDI", "BDF", "LDM", "PCC", "HLL"];

        // Attribute full names
        var attrName = {
            BDP: "Binge Drinking Prevalence (BDP)",
            BDI: "Binge Drinking Intensity (BDI)",
            BDF: "Binge Drinking Frequency (BDF)",
            LDM: "Liver Disease Mortality (LDM)",
            PCC: "Per Capita Alcohol Consumption (PCC)",
            HLL: "Commercial Host Liability Laws Category (HLL)"
        };

        // Attribute full descriptions & units
        var attrDesc = {
            BDP: "<u>Percent</u> of adults aged ≥18 years who report having ≥5 drinks (men) or ≥4 drinks (women) on ≥1 occasion during the previous 30 days; 2014",
            BDI: "Age-adjusted mean of largest <u>number of drinks</u> consumed on an occasion in the previous 30 days among adult binge drinkers aged ≥18 years; 2014",
            BDF: "Age-adjusted mean of <u>binge drinking episodes</u> during the previous 30 days among adult binge drinkers aged ≥18 years; 2014",
            LDM: "<u>Deaths per 100,000</u> with International Classification of Diseases (ICD)-10 codes K70 or K73–K74 as the underlying cause of death among residents during a calendar year; 2014",
            PCC: "<u>Gallons of pure alcohol</u> consumed during a calendar year among persons aged >= 14 years; 2014",
            HLL: "With commercial host liability laws, alcohol retailers/hosts are potentially liable for alcohol-related harms. <u>State categories</u>: (1) commercial host liability with no major limitations; (2) commercial host liability with major limitations; or (3) no commercial host liability; 2015"
        };
        // descriptions Source: https://www.cdc.gov/cdi/definitions/alcohol.html


        // initial & current attribute displayed on the map
        var expressed = attrArray[0];

        return [attrArray, attrName, attrDesc, expressed]

    };

    function makeMap(topoJsonStates, map, path, csvData, expressed) {

        //create the color scale
        var colorScale = makeColorScale(csvData, expressed);

        //Example 1.3 line 24...add enumeration units to the map
        setEnumerationUnits(topoJsonStates, map, path, colorScale, expressed);

        //add coordinated visualization to the map
        setChart(csvData, colorScale, expressed);

    };

    function joinData(csvData, topoJsonStates, attrArray) {

        //loop through csv to assign each set of csv attribute values to geojson region
        for (var i = 0; i < csvData.length; i++) {
            var csvRegion = csvData[i]; //the current region
            var csvKey = csvRegion.ABBR; //the CSV primary key

            //loop through geojson regions to find correct region
            for (var a = 0; a < topoJsonStates.length; a++) {

                var geojsonProps = topoJsonStates[a].properties; //the current region geojson properties
                var geojsonKey = geojsonProps.postal; //the geojson primary key

                //where primary keys match, transfer csv data to geojson properties object
                if (geojsonKey == csvKey) {


                    //assign all attributes and values
                    attrArray.forEach(function (attr) {
                        var val = parseFloat(csvRegion[attr]); //get csv attribute value
                        geojsonProps[attr] = val; //assign attribute and value to geojson properties
                    });
                };
            };
        };
    };

    //function to create color scale generator
    function makeColorScale(csvData, expressed) {

        // colors from colorbrewer
        var colorClasses = [
            "#ffe6bf",
            "#fdcc8a",
            "#fc8d59",
            "#e34a33",
            "#b30000"
        ];

        //create color scale generator
        var colorScale = d3.scaleQuantile()
            .range(colorClasses);

        //build two-value array of minimum and maximum expressed attribute values
        var minmax = [
        d3.min(csvData, function (d) {
                return parseFloat(d[expressed]);
            }),
        d3.max(csvData, function (d) {
                return parseFloat(d[expressed]);
            })
    ];
        //assign two-value array as scale domain
        colorScale.domain(minmax);


        return colorScale;
    };

    // function to dynamically set the enumeration units
    function setEnumerationUnits(topoJsonStates, map, path, colorScale, expressed) {

        //add states to map
        var regions = map.selectAll(".states")
            .data(topoJsonStates)
            .enter()
            .append("path")
            .attr("class", function (d) {
                var returnVar = "states " + d.properties.postal; //postal, ABBR, STATE
                return returnVar;
            })
            .attr("d", path)
            .style("fill", function (d) {
                return choropleth(d.properties, colorScale, expressed);
            })
            .on("mouseover", function (d) {
                highlight(d.properties);
            }).on("mouseout", function (d) {
                dehighlight(d.properties);
            });

    };

    // Creates color scale based on the selected attribute
    function choropleth(props, colorScale, expressed) {
        //make sure attribute value is a number
        var val = parseFloat(props[expressed]);
        //if attribute value exists, assign a color; otherwise assign gray
        if (typeof val == 'number' && !isNaN(val)) {
            return colorScale(val);
        } else {
            return "#CCC";
        };
    };

    // initializes the the chart variables
    function setChartVars() {
        var chartWidth = 650,
            //    var chartWidth = window.innerWidth * 0.425,
            chartHeight = 200,
            leftPadding = 25,
            rightPadding = 2,
            topBottomPadding = 5,
            //            chartInnerWidth = chartWidth,
            chartInnerWidth = chartWidth - leftPadding - rightPadding,

            chartInnerHeight = chartHeight - topBottomPadding * 2,
            translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

        //create a second svg element to hold the bar chart

        //        var minPop = d3.min(cityPop, function (d) {
        //            return d.population;
        //        });
        //
        //        //find the maximum value of the array
        //        var maxPop = d3.max(cityPop, function (d) {
        //            return d.population;
        //        });       

        //        var maxAttr = d3.max(csvData, function (d) {
        //            return parseFloat(d[expressed]);
        //        });

        var maxAttr = 25;

        //create a scale to size bars proportionally to frame
        var yScale = d3.scaleLinear()
            .range([0, chartHeight])
            .domain([0, maxAttr]);

        var yScaleAxis = d3.scaleLinear()
            .range([chartHeight, 0])
            .domain([0, maxAttr]);



        return [chartWidth, chartHeight, leftPadding, rightPadding, topBottomPadding, chartInnerWidth, chartInnerHeight, translate, yScale, yScaleAxis]
    };

    // Updates the chart on page initialization & whenever the attribute is changed
    function updateChart(csvData, chartHeight) {

        var maxAttr = d3.max(csvData, function (d) {
            return parseFloat(d[expressed]);
        });

        //create a scale to size bars proportionally to frame
        var yScale = d3.scaleLinear()
            .range([0, chartHeight])
            .domain([0, maxAttr]);

        var yScaleAxis = d3.scaleLinear()
            .range([chartHeight, 0])
            .domain([0, maxAttr]);

        var yAxis = d3.axisLeft(yScaleAxis)

        //update the charts axis 
        d3.selectAll("g.axis")
            .call(yAxis);
    };

    //function to create coordinated bar chart
    function setChart(csvData, colorScale, expressed) {

        var maxAttr = d3.max(csvData, function (d) {
            return parseFloat(d[expressed]);
        });

        //create a scale to size bars proportionally to frame
        var yScale = d3.scaleLinear()
            .range([0, chartHeight])
            .domain([0, maxAttr]);

        var yScaleAxis = d3.scaleLinear()
            .range([chartHeight, 0])
            .domain([0, maxAttr]);

        var yAxis = d3.axisLeft(yScaleAxis)

        // update the charts axis 
        d3.selectAll("g.axis")
            .call(yAxis);

        // chart frame dimensions
        var chart = d3.select("#chartWrapper")
            .append("svg")
            .attr("width", chartWidth)
            .attr("height", chartHeight)
            .attr("class", "chart");

        // set bars for each province
        var bars = chart.selectAll(".bars")
            .data(csvData)
            .enter()
            .append("rect")
            .sort(function (a, b) {
                return b[expressed] - a[expressed]
            })
            .attr("class", function (d) {
                return "bars " + d.ABBR;
            })
            .attr("width", chartWidth / csvData.length - 1)
            .attr("x", function (d, i) {
                return i * (chartWidth / csvData.length);
            })
            .attr("height", function (d) {
                return yScale(parseFloat(d[expressed]));
            })
            .attr("y", function (d) {
                return chartHeight - yScale(parseFloat(d[expressed]));
            })
            .style("fill", function (d) {
                return choropleth(d, colorScale, expressed);
            })
            .attr("transform", translate)
            .on("mouseover", highlight)
            .on("mouseout", dehighlight);


        // Set chart title
        var chartTitle = chart.append("text")
            .attr("x", 430)
            .attr("y", 30)
            .attr("class", "chartTitle")
            .text(expressed + " in each state");

        // Sets the description text below the dropdown
        d3.select("#attributeDescriptionText")
            .html("<strong>" + expressed + ":</strong> " + attrDesc[expressed]);

        //create vertical axis generator
        var yAxis = d3.axisLeft(yScaleAxis)
            //.scale(yScale)
            //        .orient("left");


        //place axis
        var axis = chart.append("g")
            .attr("class", "axis")
            .attr("transform", translate)
            .call(yAxis);

        //create frame for chart border
        var chartFrame = chart.append("rect")
            .attr("class", "chartFrame")
            .attr("width", chartInnerWidth)
            .attr("height", chartInnerHeight)
            .attr("transform", translate);

    };

    // Creates the dropdown to select an attribute
    function createDropdown(attrArray, csvData) {
        //add select element
        var dropdown = d3.select("#dropdownWrapper")
            .append("select")
            .attr("class", "dropdown")
            .on("change", function () {
                changeAttribute(this.value, csvData)
            });

        //        //add initial option
        //        var titleOption = dropdown.append("option")
        //            .attr("class", "titleOption")
        //            .attr("disabled", "true")
        //            .text("Select Attribute");

        //add attribute name options
        var attrOptions = dropdown.selectAll("attrOptions")
            //            .data(attrName)
            .data(attrArray)
            .enter()
            .append("option")
            .attr("value", function (d) {
                return d
            })
            .text(function (d) {
                return attrName[d]
            });

    };


    // dropdown change listener handler
    function changeAttribute(attribute, csvData) {
        //change the expressed attribute
        expressed = attribute;

        d3.select("#attributeDescriptionText")
            .html("<strong>" + expressed + ":</strong> " + attrDesc[expressed]);

        var maxAttr = d3.max(csvData, function (d) {
            return parseFloat(d[expressed]);
        });

        // create a scale to size bars proportionally to frame
        yScale = d3.scaleLinear()
            .range([0, chartHeight])
            .domain([0, maxAttr]);

        yScaleAxis = d3.scaleLinear()
            .range([chartHeight, 0])
            .domain([0, maxAttr]);

        var yAxis = d3.axisLeft(yScaleAxis)

        // update the charts axis 
        d3.selectAll("g.axis")
            .call(yAxis);

        // recreate the color scale
        var colorScale = makeColorScale(csvData, expressed);

        // recolor enumeration units
        var regions = d3.selectAll(".states")
            .transition()
            .duration(1000)
            .style("fill", function (d) {
                return choropleth(d.properties, colorScale, expressed)
            });

        // re-sort, resize, and recolor bars
        var bars = d3.selectAll(".bars")
            .sort(function (a, b) {
                return b[expressed] - a[expressed]
            })
            .transition() //add animation
            .delay(function (d, i) {
                return i * 20
            })
            .duration(500)
            .attr("x", function (d, i) {
                return i * (chartWidth / csvData.length);
            })
            .attr("height", function (d) {
                return yScale(parseFloat(d[expressed]));
            })
            .attr("y", function (d) {
                return chartHeight - yScale(parseFloat(d[expressed]));
            })
            .style("fill", function (d) {
                return choropleth(d, colorScale, expressed);
            })
            .attr("transform", translate);

        var chartTitle = d3.select(".chartTitle")
            .text(expressed + " in each state");

        var maxAttr = d3.max(csvData, function (d) {
            return parseFloat(d[expressed]);
        });




    };

    // highlight appropriate state and bar
    function highlight(props) {
        //change stroke
        var selected = d3.selectAll("." + props.postal)
            .style("stroke", "black")
            .style("stroke-width", "4");
        var selected2 = d3.selectAll("." + props.ABBR)
            .style("stroke", "black")
            .style("stroke-width", "4");
        setLabel(props)
    };

    // dehighlight the appropriate state and bar
    function dehighlight(props) {
        var selected = d3.selectAll("." + props.postal)
            .style("stroke", "white")
            .style("stroke-width", "1");
        var selected2 = d3.selectAll("." + props.ABBR)
            .style("stroke", "white")
            .style("stroke-width", "1");
        d3.select(".infolabel")
            .remove();
    };

    //function to create dynamic label
    function setLabel(props) {
        //label content
        var labelAttribute = "<span id='infoLabelNumber'>" + props[expressed] +
            "</span><br>" + expressed + "";

        //create info label div
        var infolabel = d3.select("#infoLabelWrapper")
            .append("div")
            .attr("class", "infolabel")
            .attr("id", "label")
            //            .attr("id", props.ABBR + "_label")
            .html(labelAttribute);

        var regionName = infolabel.append("div")
            .attr("class", "labelname")
            .html(props.name);
    };


    // **********************************
    // Start JavaScript when window loads
    // **********************************
    window.onload = main()

})();
