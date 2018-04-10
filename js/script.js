// All JS contained within this function
function main() {

    // prep map variables
    var [width, height, map, path] = prepMapVars()

    // LOAD DATA
    // Load the data & states layer asynchronously (d3.queue is depreciated!)
    // All code gets executed within Promise.all so that the data is available for use
    var csvDataPromise = d3.csv("../data/cdc_alcohol_byState.csv")
    var jsonStatesPromise = d3.json("../data/ne_states_d3display.topojson")
    Promise.all([csvDataPromise, jsonStatesPromise]).then(function (promiseValues) {

        // unpack the loaded data into variables
        var [csvData, jsonStates] = promiseValues
        //console.log(csvData, jsonStates)

        // get variables for data join
        var [attrArray, expressed, attrName, attrDesc] = prepAttrVars();

        // get feature collection variable
        //translate states TopoJSON
        var topoJsonStates = topojson.feature(jsonStates, jsonStates.objects.ne_states_d3display).features;

        //join csv data to the topojson
        joinData(csvData, topoJsonStates, attrArray);
        console.log(topoJsonStates);

        // make map
        makeMap(topoJsonStates, map, path, csvData, expressed);







    });

};

function prepMapVars() {
    //map frame dimensions
    var width = 960,
        height = 460;

    //create new svg container for the map
    var map = d3.select("body")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height);

    //create Albers equal area conic projection centered on France
    var projection = d3.geoAlbers()
        //        .center([0, 46.2])
        //        .rotate([-2, 0, 0])
        //        .parallels([43, 62])
        .scale(800) //        .translate([width / 2, height / 2]);

    var path = d3.geoPath()
        .projection(projection);

    return [width, height, map, path]

};

function prepAttrVars() {

    var attrArray = ["BDP", "BDI", "BDF", "LDM", "PCC", "HLL"];

    // initial & current attribute displayed on the map
    var expressed = attrArray[0];

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

    return [attrArray, expressed, attrName, attrDesc]

};

function makeMap(topoJsonStates, map, path, csvData, expressed) {
    //console.log(topoJsonStates);


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
    //    console.log("regions");
    //    console.log(topoJsonStates);


    //create the color scale
    var colorScale = makeColorScale(csvData, expressed);

    //Example 1.3 line 24...add enumeration units to the map
    setEnumerationUnits(topoJsonStates, map, path, colorScale, expressed);

    return topoJsonStates
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

                //console.log("MATCH: ", geojsonKey, csvKey) 

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

    console.log("colorScale");
    console.log(colorScale);

    return colorScale;
};

function setEnumerationUnits(topoJsonStates, map, path, colorScale, expressed) {


    console.log("Starting setEnumerationUnits");
    //add states to map - broken somewhere in this var block
    var regions = map.selectAll(".states")
        .data(topoJsonStates)
        .enter()
        .append("path")
        .attr("class", function (d) {
            var returnVar = "states " + d.properties.postal; //postal, ABBR, STATE
            //console.log("returnVar");
            //console.log(returnVar);
            return returnVar;
        })
        .attr("d", path)
        .style("fill", function (d) {
            return choropleth(d.properties, colorScale, expressed);
        });
    console.log("End setEnumerationUnits");
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
// Start JavaScript when window loads
window.onload = main()
