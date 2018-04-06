// All JS contained within this function
function main() {

    // prep map variables
    var [width, height, map, projection, path] = prepMapVars()

    // LOAD DATA
    // Load the data & states layer asynchronously (d3.queue is depreciated!)
    // All code gets executed within Promise.all so that the data is available for use
    var csvDataPromise = d3.csv("../data/cdc_alcohol_byState.csv")
    var jsonStatesPromise = d3.json("../data/ne_states_d3display.topojson")
    Promise.all([csvDataPromise, jsonStatesPromise]).then(function (promiseValues) {

        // unpack the loaded data into variables
        var [csvData, jsonStates] = promiseValues
        console.log(csvData, jsonStates)

        // make map & get feature collection
        topoJsonStates = makeMap(jsonStates, map, path);

        // get variables for data join
        var [attrArray, attrName, attrDesc] = prepAttrVars();

        //join data
        joinData(csvData, topoJsonStates, attrArray);

        console.log(topoJsonStates);

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

    return [width, height, map, projection, path]

};

function prepAttrVars() {

    var attrArray = ["BDP", "BDI", "BDF", "LDM", "PCC", "HLL"];

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

    return [attrArray, attrName, attrDesc]

};

function makeMap(jsonStates, map, path) {
    //translate states TopoJSON
    var topoJsonStates = topojson.feature(jsonStates, jsonStates.objects.ne_states_d3display);
    console.log(topoJsonStates);


    //add states countries to map
    var statesLayer = map.append("path")
        .datum(topoJsonStates)
        .attr("class", "states")
        .attr("d", path);

    return topoJsonStates
};

function joinData(csvData, topoJsonStates, attrArray) {
    //loop through csv to assign each set of csv attribute values to geojson region
    for (var i = 0; i < csvData.length; i++) {
        var csvRegion = csvData[i]; //the current region
        var csvKey = csvRegion.ABBR; //the CSV primary key

        //loop through geojson regions to find correct region
        for (var a = 0; a < topoJsonStates.features.length; a++) {

            var geojsonProps = topoJsonStates.features[a].properties; //the current region geojson properties
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

// Start JavaScript when window loads
window.onload = main()
