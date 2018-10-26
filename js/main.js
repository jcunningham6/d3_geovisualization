// main.js for D3 Lab - Part 2

// start script when window loads
window.onload = setMap();

// set up choropleth map
function setMap() {
	// use queue to parallelize asynchronous data loading
	d3.queue()
		.defer(d3.csv, "data/wv_data.csv")
		.defer(d3.json, "data/wvcounties.topojson")
		.await(callback);
		
	function callback(error, csvData, topojsonData) {
		console.log(error);
		console.log(csvData);
		console.log(topojsonData);
	}
}