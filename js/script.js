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
        var csvDataPromise = d3.csv("../data/cdc_alcohol_byState.csv")
        var jsonStatesPromise = d3.json("../data/ne_states_d3display.topojson")
        Promise.all([csvDataPromise, jsonStatesPromise]).then(function (promiseValues) {

            // unpack the loaded data into variables
            var [csvData, jsonStates] = promiseValues


            // translate states TopoJSON
            var topoJsonStates = topojson.feature(jsonStates, jsonStates.objects.ne_states_d3display).features;

            //join csv data to the topojson
            joinData(csvData, topoJsonStates, attrArray);

            // make map & coordinated visualization
            makeMap(topoJsonStates, map, path, csvData, expressed);

            // x
            createDropdown(attrArray, csvData)




        });

    };

    function prepMapVars() {
        //map frame dimensions
        var width = 650,
            height = 500;

        //create new svg container for the map
        var map = d3.select("body")
            .append("svg")
            .attr("class", "map")
            .attr("width", width)
            .attr("height", height);

        //create Albers equal area conic projection centered on France
        var projection = d3.geoAlbers()
            .center([13, 38])

        //        .rotate([-2, 0, 0])
        //        .parallels([43, 62])
        .scale(800) //        .translate([width / 2, height / 2]);

        var path = d3.geoPath()
            .projection(projection);

        return [width, height, map, path]

    };

    function prepAttrVars() {

        var attrName = {
            BDP: "Binge Drinking Prevalence",
            BDI: "Binge Drinking Intensity",
            BDF: "Binge Drinking Frequency",
            LDM: "Liver Disease Mortality",
            PCC: "Per Capita Alcohol Consumption",
            HLL: "Commercial Host Liability Laws Category"
        };

        var attrDesc = {
            BDP: "Percent of adults aged ≥18 years who report having ≥5 drinks (men) or ≥4 drinks (women) on ≥1 occasion during the previous 30 days (2014)",
            BDI: "Age-adjusted mean of largest number of drinks consumed on an occasion in the previous 30 days among adult binge drinkers aged ≥18 years (2014)",
            BDF: "Age-adjusted mean of binge drinking episodes during the previous 30 days among adult binge drinkers aged ≥18 years (2014)",
            LDM: "Deaths per 100,000 with International Classification of Diseases (ICD)-10 codes K70 or K73–K74 as the underlying cause of death among residents during a calendar year (2014)",
            PCC: "Gallons of pure alcohol consumed during a calendar year among persons aged >= 14 years (2014)",
            HLL: "With commercial host liability laws, alcohol retailers/hosts are potentially liable for alcohol-related harms. State has: (1) commercial host liability with no major limitations; (2) commercial host liability with major limitations; or (3) no commercial host liability; (2015)"
        };

        // descriptions Source: https://www.cdc.gov/cdi/definitions/alcohol.html

        var attrArray = ["BDP", "BDI", "BDF", "LDM", "PCC", "HLL"];

        // initial & current attribute displayed on the map
        var expressed = attrArray[0];
        console.log(expressed);

        return [attrArray, attrName, attrDesc, expressed]

    };

    function makeMap(topoJsonStates, map, path, csvData, expressed) {


        // NOT FOR CORY
        //add states countries to map
        //    var statesLayer = map.append("path")
        //        .datum(topoJsonStates)
        //        .attr("class", "states")
        //        .attr("d", path);



        //    var regions = map.selectAll(".regions")
        //        .data(topoJsonStates)
        //        .enter()
        //        .append("path")
        //        .attr("class", function (d) {
        //            return "states " + d.properties.postal;
        //        })
        //        .attr("d", path);


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
    function makeColorScale(data, expressed) {
        var colorClasses = [
        "#D4B9DA",
        "#C994C7",
        "#DF65B0",
        "#DD1C77",
        "#980043"
    ];

        //create color scale generator
        var colorScale = d3.scaleQuantile()
            .range(colorClasses);

        //build two-value array of minimum and maximum expressed attribute values
        var minmax = [
        d3.min(data, function (d) {
                return parseFloat(d[expressed]);
            }),
        d3.max(data, function (d) {
                return parseFloat(d[expressed]);
            })
    ];
        //assign two-value array as scale domain
        colorScale.domain(minmax);


        return colorScale;
    };

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
            })
            .on("mouseout", function (d) {
                dehighlight(d.properties);
            });

    };

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

    function setChartVars() {
        var chartWidth = 650,
            //    var chartWidth = window.innerWidth * 0.425,
            chartHeight = 300,
            leftPadding = 25,
            rightPadding = 2,
            topBottomPadding = 5,
            //            chartInnerWidth = chartWidth,
            chartInnerWidth = chartWidth - leftPadding - rightPadding,

            chartInnerHeight = chartHeight - topBottomPadding * 2,
            translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

        //create a second svg element to hold the bar chart
        var br = d3.select("body")
            .append("br")

        //create a scale to size bars proportionally to frame
        var yScale = d3.scaleLinear()
            .range([0, chartHeight])
            .domain([0, 30]);

        var yScaleAxis = d3.scaleLinear()
            .range([chartHeight, 0])
            .domain([0, 30]);



        return [chartWidth, chartHeight, leftPadding, rightPadding, topBottomPadding, chartInnerWidth, chartInnerHeight, translate, yScale, yScaleAxis]
    };

    //function to create coordinated bar chart
    function setChart(csvData, colorScale, expressed) {
        //chart frame dimensions


        var chart = d3.select("body")
            .append("svg")
            .attr("width", chartWidth)
            .attr("height", chartHeight)
            .attr("class", "chart");

        //Example 2.4 line 8...set bars for each province
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


        //        //annotate bars with attribute value text
        //        var numbers = chart.selectAll(".numbers")
        //            .data(csvData)
        //            .enter()
        //            .append("text")
        //            .sort(function (a, b) {
        //                return b[expressed] - a[expressed]
        //            })
        //            .attr("class", function (d) {
        //                return "numbers " + d.ABBR;
        //            })
        //            .attr("text-anchor", "middle")
        //            .attr("x", function (d, i) {
        //                var fraction = chartWidth / csvData.length;
        //                return i * fraction + (fraction - 1) / 2;
        //            })
        //            .attr("y", function (d) {
        //                return chartHeight - yScale(parseFloat(d[expressed])) + 15;
        //            })
        //            .text(function (d) {
        //                return d[expressed];
        //            })
        //            .attr("transform", translate);

        var chartTitle = chart.append("text")
            .attr("x", 400)
            .attr("y", 30)
            .attr("class", "chartTitle")
            .text(expressed + " in each state");

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

    function createDropdown(attrArray, csvData) {
        //add select element
        var dropdown = d3.select("body")
            .append("select")
            .attr("class", "dropdown")
            .on("change", function () {
                changeAttribute(this.value, csvData)
            });

        //add initial option
        var titleOption = dropdown.append("option")
            .attr("class", "titleOption")
            .attr("disabled", "true")
            .text("Select Attribute");

        //add attribute name options
        var attrOptions = dropdown.selectAll("attrOptions")
            .data(attrArray)
            .enter()
            .append("option")
            .attr("value", function (d) {
                return d
            })
            .text(function (d) {
                return d
            });
    };


    ////dropdown change listener handler
    //function changeAttribute(attribute, csvData) {
    //    //change the expressed attribute
    //    expressed = attribute;
    //    console.log(expressed);
    //
    //    //recreate the color scale
    //    var colorScale = makeColorScale(csvData, expressed);
    //
    //    //recolor enumeration units
    //    var regions = d3.selectAll(".states")
    //        .style("fill", function (d) {
    //            return choropleth(d.properties, colorScale, expressed)
    //        });
    //};

    function changeAttribute(attribute, csvData) {
        //change the expressed attribute
        expressed = attribute;

        //recreate the color scale
        var colorScale = makeColorScale(csvData, expressed);

        //recolor enumeration units
        var regions = d3.selectAll(".states")
            .transition()
            .duration(1000)
            .style("fill", function (d) {
                return choropleth(d.properties, colorScale, expressed)
            });

        //re-sort, resize, and recolor bars
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
    };

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
        var labelAttribute = "<h1>" + props[expressed] +
            "</h1><b>" + expressed + "</b>";

        //create info label div
        var infolabel = d3.select("body")
            .append("div")
            .attr("class", "infolabel")
            .attr("id", "label")
            //            .attr("id", props.ABBR + "_label")
            .html(labelAttribute);
        //console.log(props.postal);

        var regionName = infolabel.append("div")
            .attr("class", "labelname")
            .html(props.name);
        //console.log(props);
    };

    // Start JavaScript when window loads
    window.onload = main()

})();
