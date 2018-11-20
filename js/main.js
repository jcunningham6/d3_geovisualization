// main.js for D3 Lab 2

(function() {
	
//************pseudo-global variables************

var csvAttrArray = ["popdensity", "religion", "bachelors", "medincome", "medage"] // csv attributes
var expressed = csvAttrArray[0] // initial csv attribute

// chart frame dimensions
var chartWidth = window.innerWidth * 0.425;
var chartHeight = 520;
var leftPadding = 25;
var rightPadding = 2;
var topBottomPadding = 5;
var chartInnerWidth = chartWidth - leftPadding - rightPadding;
var chartInnerHeight = chartHeight - topBottomPadding * 2;
var translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

// scale for bar height
var yScale = d3.scaleLinear()
	.range([463, 0])
	.domain([0,450]);
	
// better names for attributes in dropdown
var clean_popdensity = "Population Density";
var clean_religion = "Number Belonging to Religious Congregations";
var clean_bachelors = "Percent with Bachelor's Degree or Higher";
var clean_medincome = "Median Income";
var clean_medage = "Median Age";

//***********************************************



// start script when window loads
window.onload = setMap();

// set up choropleth map
function setMap() {
	/* var width = 600; */
	var width = window.innerWidth*0.5;
	var height = 550;
	
	var map = d3.select("#main_content")
		.append("svg")
		.attr("class", "map")
		.attr("width", width)
		.attr("height", height)
		.call(d3.zoom().on("zoom", function () {
			map.attr("transform", d3.event.transform)
         }))
        .append("g");
		
	// Albers equal area conic projection
	var projection = d3.geoAlbers()
		.center([00, 38.9])
		.rotate([80.2, 0, 0])
		/* .parallels(29.5, 45.5) */ // not needed?
		.scale(7500)
		.translate([width /2, height /2]);
	
	// path generator
	var path = d3.geoPath()
		.projection(projection)
		.pointRadius(3);	
		
	var svg = d3.select("#main_content")
		.attr("width", width)
		.attr("height", height);
		
	// use queue to parallelize asynchronous data loading
	d3.queue()
		.defer(d3.csv, "data/wv_data.csv")
		.defer(d3.json, "data/wvcolleges.topojson")
		.defer(d3.json, "data/wvworships.topojson")
		.defer(d3.json, "data/states84.topojson")
		.defer(d3.json, "data/wvcounties.topojson")
		.await(callback);
		
	function callback(error, csvData, colleges, worshipsites, states, wv) {
		console.log(csvData);
		console.log(wv);
		
		console.log(states);
		
		// point locations for colleges
		var wvColleges = topojson.feature(colleges, colleges.objects.wvcolleges);
		console.log(wvColleges);
		
		// point locations for worship sites
		var wvWorships = topojson.feature(worshipsites, worshipsites.objects.wvworships);
		console.log(wvWorships);
		
		// polygons of US states
		var usStates = topojson.feature(states, states.objects.states84);
		console.log(usStates);
		
		var polyStates = map.append("path")
			.datum(usStates)
			.attr("class", "polyStates")
			.style("fill", "#EEEEEE")
			.style("stroke", "#A9A9A9")
			.style("stroke-width", "0.5")
			.attr("d", path);
		
		// translate WV counties topojson to GeoJSON
		var wvCounties = topojson.feature(wv, wv.objects.wvcounties).features;
		console.log(wvCounties);	
		
		// join csv data to county GeoJSON enumeration units
		wvCounties = joinData(wvCounties, csvData);
		
		// create color scale
		var colorScale = makeColorScale(csvData);
		
		// add WV county enumeration units to map
		setEnumerationUnits(wvCounties, map, path, colorScale);
		
		// add coordinated visualization to the map
		setChart(csvData, colorScale);
		
		// add dropdown option
		createDropDown(csvData);
		
		// radio buttons	
		buttons = d3.selectAll("input");
		buttons.on("change", function(d) {
			console.log("Button changed to " + this.value);
			var radioSelection = this.value;
			changePoints(map, path, radioSelection, wvColleges, wvWorships);
		});
		
	} // end of callback()
} // end of setMap()

// function for loading/unloading college and worship site points
function changePoints(map, path, selection, wvColleges, wvWorships) {
	if (selection == 'colleges') {
		// first remove worship points
		removePoints(selection);
		// place college points
		var ptsColleges = map.append("path")
			.datum(wvColleges)
			.attr("class", "ptsColleges")
			.style("fill", "#FF0000")
			.style("stroke", "#000")
			.attr("d", path);
	}
	else if (selection == 'worshipsites') {
		// first remove college points
		removePoints(selection);
		// place worship points
		var ptsWorshipSites = map.append("path")
			.datum(wvWorships)
			.attr("class", "ptsWorshipSites")
			.style("fill", "#FFFF00")
			.style("stroke", "#000")
			.attr("d", path);
	}
	else {
		// remove both college and worship points
		removePoints(selection);
	}
}

// function for removing points --> called from within changePoints()
function removePoints(selection) {
	if (selection == 'colleges') {
		d3.selectAll(".ptsWorshipSites")
			.remove();
		console.log("Removing worshipsites");
	}
	else if (selection == 'worshipsites') {
		d3.selectAll(".ptsColleges")
			.remove();
		console.log("Removing colleges");
	}
	else {
		d3.selectAll(".ptsColleges")
			.remove();
		d3.selectAll(".ptsWorshipSites")
			.remove();
		console.log("Removing all points");
	}
}

// dropdown selection tool		
function createDropDown(csvData) {
	// add <select> element
	var dropdown = d3.select("#expound")
		.append("select")
		.attr("class", "dropdown")
		.on("change", function() {
			changeAttribute(this.value, csvData)
		});
		
	// add initial options
	var titleOption = dropdown.append("option")
		.attr("class", "titleOption")
		.attr("disabled", "true")
		.text("Select Attribute");
		
	// add attribute name options --> use clean titles
	var attrOptions = dropdown.selectAll("attrOptions")
		.data(csvAttrArray)
		.enter()
		.append("option")
		.attr("value", function(d) { return d })
		.text(function(d) {
			if (d == csvAttrArray[0]) {
				d = clean_popdensity;
			}
			else if (d == csvAttrArray[1]) {
				d = clean_religion;
			}
			else if (d == csvAttrArray[2]) {
				d = clean_bachelors;
			}
			else if (d == csvAttrArray[3]) {
				d = clean_medincome;
			}
			else {
				d = clean_medage;
			}
			return d;
		});
}

// create bar chart
function setChart(csvData, colorScale) {
	// create second svg element to hold bar chart
	var chart = d3.select("#main_content")
		.append("svg")
		.attr("width", chartWidth)
		.attr("height", chartHeight)
		.attr("class", "chart");
		
	// create rectangle for chart background fill
	var chartBackground = chart.append("rect")
		.attr("class", "chartBackground")
		.attr("width", chartInnerWidth)
		.attr("height", chartInnerHeight)
		.attr("transform", translate);
		
	// set bars for each county
	var bars = chart.selectAll(".bar")
		.data(csvData)
		.enter()
		.append("rect")
		.sort(function(a, b) {
			return b[expressed]-a[expressed];
		})
		.attr("class", function(d) {
			return "bar " + d.code;
		})
		.attr("width", chartInnerWidth / csvData.length -1)
		.on("mouseover", highlight)
		.on("mouseout", dehighlight)
		.on("mousemove", moveLabel);
		
	var desc = bars.append("desc")
		.text('{"stroke": "none", "stroke-width": "0px"}');
	
	// chart title using <text> element
	var chartTitle = chart.append("text")
		.attr("x", 40)
		.attr("y", 500)
		.attr("class", "chartTitle");
		
	// vertical axis generator
	var yAxis = d3.axisLeft()
		.scale(yScale);
	
	// place axis --> create axis "g" group
	var axis = chart.append("g")
		.attr("class", "axis")
		.attr("transform", translate)
		.call(yAxis);
		
	// frame for chart border
	var chartFrame = chart.append("rect")
		.attr("class", "chartFrame")
		.attr("width", chartInnerWidth)
		.attr("height", chartInnerHeight)
		.attr("transform", translate);
		
	// set bar positions, heights, colorScale
	updateChart(bars, csvData.length, colorScale);
}

// dropdown change listener handler
function changeAttribute(attribute, csvData) {
	// change expressed attribute
	expressed = attribute;
	
	// retrieve max value of attribute according to dropdown menu
	var maxValue = d3.max(csvData, function(d) {
		return +d[expressed];
	});
	
	console.log(maxValue);
	
	// change y-axis values based on the attribute selected
	if (expressed == csvAttrArray[0]) {
	 yScale = d3.scaleLinear()
		.range([463, 0])
		.domain([0, maxValue + 30]);            
	}
	else if (expressed == csvAttrArray[1]) {  
		yScale = d3.scaleLinear()
			.range([463, 0]) 
			.domain([0, maxValue + 18.9]);
	}
	else if  (expressed == csvAttrArray[2]) {  
		yScale = d3.scaleLinear()
			.range([463, 0]) 
			.domain([0, maxValue + 0.8]);
	}
	else if (expressed == csvAttrArray[3]) {  
		yScale = d3.scaleLinear()
			.range([463, 0]) 
			.domain([0, maxValue + 10.2]);
	}
	else {
		yScale = d3.scaleLinear()
			.range([463, 0]) 
			.domain([0, maxValue + 2.9]);            
	}

	// recreate color scale
	var colorScale = makeColorScale(csvData);
	
	// recolor enumeration units (i.e. counties)
	var counties = d3.selectAll(".counties")
		.transition()
		.duration(1500)
		.style("fill", function(d) {
			return choropleth(d.properties, colorScale);
		});
		
	// re-sort, re-size, re-color bars in visualization
	var bars = d3.selectAll(".bar")
		// re-sort
		.sort(function(a, b) {
			return b[expressed] - a[expressed];
		})
		.transition()
		.delay(function(d, i) {
			return i * 20;
		})
		.duration(2500)
		.ease(d3.easeBounceOut);
		
	updateChart(bars, csvData.length, colorScale);
}

// function to update bar chart
function updateChart(bars, n, colorScale) {
	console.log(expressed);
	
	// position bars
	bars.attr("x", function(d, i) {
			return i * (chartInnerWidth / n) + leftPadding;
		})
		// size/re-size bars
		.attr("height", function(d, i) {
			return 463 - yScale(parseFloat(d[expressed]));
		})
		.attr("y", function(d, i) {
			return yScale(parseFloat(d[expressed])) + topBottomPadding;
		})
		// color/re-color bars
		.style("fill", function(d) {
			return choropleth(d, colorScale);
		});
	
	// add text to chart title
	var chartTitle = d3.select(".chartTitle")
		//.text(expressed + " in each county"); // standard expression for bar chart title
		// anonymous function to present clean titles in chart
		.text(function() {
			if (expressed == csvAttrArray[0]) {
				return clean_popdensity + " of each county";
			}
			else if (expressed == csvAttrArray[1]) {
				return clean_religion + " in each county";
			}
			else if (expressed == csvAttrArray[2]) {
				return clean_bachelors + " in each county";
			}
			else if (expressed == csvAttrArray[3]) {
				return clean_medincome + " for each county";
			}
			else {
				return clean_medage + " for each county";
			}
		});
		
	// re-generate the chart's vertical axis after changing attribute in dropdown menu
	var yAxis = d3.axisLeft()
		.scale(yScale);
		
	d3.selectAll("g.axis")
		.call(yAxis);
}

// highlighting function
function highlight(props) {
	// change stroke
	var selected = d3.selectAll("." + props.code)
		.style("stroke", "#FFFF00")
		.style("stroke-width", "2");
		
	setLabel(props);
}

// de-highlighting function
function dehighlight(props) {
	var selected = d3.selectAll("." + props.code)
		.style("stroke", function() {
			return getStyle(this, "stroke");
		})
		.style("stroke-width", function() {
			return getStyle(this, "stroke-width");
		});
		
	function getStyle(element, styleName) {
		var styleText = d3.select(element)
			.select("desc")
			.text();
			
		var styleOject = JSON.parse(styleText);
		
		return styleOject[styleName];
	}
	
	d3.select(".infolabel")
		.remove();
}

function setLabel(props) {
	// label content
	//var labelAttribute = "<h1>" + props[expressed] + "</h1><b>" + expressed + "</b>"; // standard expression for label
	var labelAttribute; // set label based on "clean" values
	
	if (expressed == csvAttrArray[0]) {    
		labelAttribute = "<h1>" + props[expressed] + "</h1><b>" + clean_popdensity + "</b>";
    } else if (expressed == csvAttrArray[1]) {
		labelAttribute = "<h1>" + props[expressed] + "</h1><b>" + clean_religion + "</b>";
    } else if (expressed == csvAttrArray[2]) {
		labelAttribute = "<h1>" + props[expressed] + "</h1><b>" + clean_bachelors + "</b>";
    } else if (expressed == csvAttrArray[3]) {
		labelAttribute = "<h1>" + props[expressed] + "</h1><b>" + clean_medincome + "</b>";
    } else {
		labelAttribute = "<h1>" + props[expressed] + "</h1><b>" + clean_medage + "</b>";
    }
	
	// info label <div>
	var infolabel = d3.select("#main_content")
		.append("div")
		.attr("class", "infolabel")
		.attr("id", props.code + "_label")
		.html(labelAttribute);
		
	var labelname = infolabel.append("div")
		.attr("class", "labelname")
		.html(props.name);
}

// enable label to move with cursor
function moveLabel() {
	// get label width
	var labelWidth = d3.select(".infolabel")
		.node()
		.getBoundingClientRect()
		.width;
	
	// use mousemove event coordinates to set label coordinates
	var x1 = d3.event.clientX + 10;
	var y1 = d3.event.clientY - 75;
	var x2 = d3.event.clientX - labelWidth - 10;
	var y2 = d3.event.clientY + 25;
	
	// horizontal label coordinate --> test for overflow
	var x = d3.event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1;
	// vertical label coordinate --> test for overflow
	var y = d3.event.clientY < 75 ? y2 : y1;
	
	d3.select(".infolabel")
		.style("left", x + "px")
		.style("top", y + "px")
}

// function to test for data value and return color
function choropleth(props, colorScale) {
    //make sure attribute value is a number
    var val = parseFloat(props[expressed]);
	
    //if attribute value exists, assign a color; otherwise assign gray
    if (typeof val == 'number' && !isNaN(val)) {
        return colorScale(val);
    }
	else {
        return "#CCC";
    }
};

// color scale
function makeColorScale(data) {
	var colorClasses = [
		"#D0D1E6",
		"#A6BDDB",
		"#74A9CF",
		"#2B8CBE",
		"#045A8D"
	];
	
	// color scale generator
	var colorScale = d3.scaleQuantile()
		.range(colorClasses);
		
	// build array of all values of the expressed attribute
	var domainArray = [];
	for (i=0; i<data.length; i++) {
		var val = parseFloat(data[i][expressed]);
		domainArray.push(val);
	}
	
	// assign array of expressed values as scale domainArray
	colorScale.domain(domainArray);
	
	return colorScale;
}

// join wvCounties geojson to csv data
function joinData(wvCounties, csvData) {
	for (var i=0; i<csvData.length; i++) {
		var csvCounty = csvData[i]; // current county
		var csvKey = csvCounty.code;
		
		// loop through GeoJSON counties to find correct county
		for (var j=0; j<wvCounties.length; j++) {
			var geojsonProps = wvCounties[j].properties; // current county geojson properties
			var geojsonKey = geojsonProps.code;
			
			if (geojsonKey == csvKey) {
				csvAttrArray.forEach(function(attr) {
					var val = parseFloat(csvCounty[attr]);
					geojsonProps[attr] = val;
				});
			}
		}
	}
	return wvCounties;
}

// place WV counties on map
function setEnumerationUnits(wvCounties, map, path, colorScale) {
	var counties = map.selectAll(".counties")
			.data(wvCounties)
			.enter()
			.append("path")
			.attr("class", function(d) {
				return "counties " + d.properties.code;
			})
			.attr("d", path)
			.style("fill", function(d) {
				//return colorScale(d.properties[expressed]);
				return choropleth(d.properties, colorScale);
			})
			.on("mouseover", function(d) {
				highlight(d.properties);
			})
			.on("mouseout", function(d) {
				dehighlight(d.properties);
			})
			.on("mousemove", moveLabel);
			
			var desc = counties.append("desc")
				.text('{"stroke": "#000", "stroke-width": "0.5px"}');
}

})();