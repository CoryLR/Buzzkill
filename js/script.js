// All JS contained within this function
function main() {

    // Load the data & states layer asynchronously (d3.queue is depreciated!)
    // All code gets executed within Promise.all so that the data is available for use
    var csvDataPromise = d3.csv("../data/cdc_alcohol_byState.csv")
    var jsonStatesPromise = d3.json("../data/ne_states_dc.topojson")
    Promise.all([csvDataPromise, jsonStatesPromise]).then(function (values) {

        // unpack the loaded data into variables
        var [csvData, jsonStates] = values
        console.log(csvData, jsonStates)

        // Yeah

    });


};



// Start JavaScript when window loads
window.onload = main()
