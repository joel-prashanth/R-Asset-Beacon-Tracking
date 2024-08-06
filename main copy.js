import "./style.css";
import Map from "ol/Map.js";
import View from "ol/View.js";
import ImageLayer from "ol/layer/Image.js";
import { ImageStatic } from "ol/source.js";
import { get as getProjection, Projection } from "ol/proj";
import { register } from "ol/proj/proj4";
import proj4 from "proj4";
import VectorSource from "ol/source/Vector";
import VectorLayer from "ol/layer/Vector";
import Style from "ol/style/Style";
import Text from "ol/style/Text";
import Fill from "ol/style/Fill";
import Stroke from "ol/style/Stroke";
import Circle from "ol/style/Circle";
import Feature from "ol/Feature";
import { Point } from "ol/geom";

const extent = [0, 0, 1024, 968];

// Register a new projection
proj4.defs("EPSG:32600", "+proj=eqc +datum=WGS84 +units=m +no_defs");
register(proj4);

const projection = new Projection({
  code: "EPSG:32600",
  units: "m",
  extent: extent,
});

// Define the image layer with the floormap
const imageLayer = new ImageLayer({
  source: new ImageStatic({
    url: "./assets/floormap.png",
    projection: projection,
    imageExtent: extent,
  }),
});

// Define a vector source and layer to display the RSSI values
const vectorSource = new VectorSource();
const vectorLayer = new VectorLayer({
  source: vectorSource,
  style: new Style({
    fill: new Fill({
      color: "rgba(0,0,255,0.1)",
    }),
  }),
});

// Create the map
const map = new Map({
  layers: [imageLayer, vectorLayer],
  view: new View({
    center: [extent[2] / 2, extent[3] / 2],
    projection: projection,
    zoom: 2,
  }),
  target: "map",
});

map.getView().fit(extent, map.getSize()); // Fit the view to the extent

// Element to display the beacon count
const beaconCountElement = document.createElement("div");
beaconCountElement.id = "beacon-count";
beaconCountElement.style.position = "absolute";
beaconCountElement.style.top = "10px";
beaconCountElement.style.left = "10px";
beaconCountElement.style.backgroundColor = "rgba(255, 255, 255, 0.8)";
beaconCountElement.style.padding = "10px";
beaconCountElement.style.borderRadius = "5px";
document.body.appendChild(beaconCountElement);

// Create a table to display beacon information
const beaconTable = document.createElement("table");
beaconTable.id = "beacon-table";
beaconTable.style.position = "absolute";
beaconTable.style.top = "80px";
beaconTable.style.left = "10px";
beaconTable.style.backgroundColor = "rgba(255, 255, 255, 0.8)";
beaconTable.style.padding = "10px";
beaconTable.style.borderCollapse = "collapse";
document.body.appendChild(beaconTable);

// Add table headers
const tableHeader = document.createElement("tr");
const headerNumber = document.createElement("th");
headerNumber.innerText = "Beacon Number";
const headerRSSI = document.createElement("th");
headerRSSI.innerText = "RSSI Value";
const headerDistance = document.createElement("th");
headerDistance.innerText = "Distance (m)";
const headerTimestamp = document.createElement("th");
headerTimestamp.innerText = "Timestamp";
const headerGateway = document.createElement("th");
headerGateway.innerText = "Gateway";
tableHeader.appendChild(headerNumber);
tableHeader.appendChild(headerRSSI);
tableHeader.appendChild(headerDistance);
tableHeader.appendChild(headerTimestamp);
tableHeader.appendChild(headerGateway);
beaconTable.appendChild(tableHeader);

// Elements to display the count of beacons scanned by each gateway
const gateway1CountElement = document.createElement("div");
gateway1CountElement.id = "gateway1-count";
gateway1CountElement.style.position = "absolute";
gateway1CountElement.style.top = "10px";
gateway1CountElement.style.right = "10px";
gateway1CountElement.style.backgroundColor = "rgba(255, 255, 255, 0.8)";
gateway1CountElement.style.padding = "10px";
gateway1CountElement.style.borderRadius = "5px";
document.body.appendChild(gateway1CountElement);

const gateway2CountElement = document.createElement("div");
gateway2CountElement.id = "gateway2-count";
gateway2CountElement.style.position = "absolute";
gateway2CountElement.style.top = "50px";
gateway2CountElement.style.right = "10px";
gateway2CountElement.style.backgroundColor = "rgba(255, 255, 255, 0.8)";
gateway2CountElement.style.padding = "10px";
gateway2CountElement.style.borderRadius = "5px";
document.body.appendChild(gateway2CountElement);

// Element to display the time taken to scan all beacons
const scanTimeElement = document.createElement("div");
scanTimeElement.id = "scan-time";
scanTimeElement.style.position = "absolute";
scanTimeElement.style.bottom = "10px";
scanTimeElement.style.left = "10px";
scanTimeElement.style.backgroundColor = "rgba(255, 255, 255, 0.8)";
scanTimeElement.style.padding = "10px";
scanTimeElement.style.borderRadius = "5px";
document.body.appendChild(scanTimeElement);

// Define gateway MAC addresses
const gateway1Mac = "94A408B0095C"; // Replace with the actual MAC address of Gateway 1
const gateway2Mac = "94A408B03D34"; // Replace with the actual MAC address of Gateway 2

// Connect to the WebSocket server
const ws = new WebSocket("ws://localhost:9002");

ws.onopen = function () {
  console.log("WebSocket connection opened");
};

ws.onmessage = function (event) {
  try {
    const data = JSON.parse(event.data);
    if (data.topic === "Honda") {
      const beaconData = data.message;
      updateRSSI(beaconData); // Update the map with the new RSSI data
    } else {
      console.error("Unexpected data format or topic.");
    }
  } catch (error) {
    console.error("Error processing WebSocket message:", error);
  }
};

ws.onclose = function () {
  console.log("WebSocket connection closed");
};

// Hardcoded mapping of MAC IDs to numbers
const macToNumberMap = {
  "BC57290206E8": 1,
  "BC57290206E0": 2,
  "BC572901FCAA": 3,
  "BC57290202C9": 4,
  "BC57290209A2": 5,
  "BC572901FDAF": 6,
  "BC5729009951": 7,
  "BC572901FC56": 8,
  "BC572901FBE7": 9,
  "BC572902056E": 10,
  "BC572902034B": 11,
  "BC5729020961": 12,

  // Add more mappings as needed
};

// Define the number of rows and columns for the matrix grid
const numRows = 3;
const numCols = 4;

// Calculate the spacing between beacons
const xSpacing = extent[2] / (numCols + 1);
const ySpacing = extent[3] / (numRows + 1);

// Calculate the coordinates for each beacon in the matrix grid
const beaconCoordinates = {};
Object.keys(macToNumberMap).forEach((mac, index) => {
  const row = Math.floor(index / numCols);
  const col = index % numCols;
  beaconCoordinates[mac] = [(col + 1) * xSpacing, (row + 1) * ySpacing];
});

let dataTimeout;
const detectedBeacons = new Set();
const lastReceivedTimestamps = {}; // Track the last received timestamp for each beacon
const rssiValues = {}; // Track the RSSI values for each beacon

const RSSI_REF = -28; // Reference RSSI value at 1 meter
const PATH_LOSS_EXPONENT = 1.3; // Path-loss exponent

// Track the number of beacons scanned by each gateway
const gatewayBeaconCount = {
  [gateway1Mac]: 0,
  [gateway2Mac]: 0,
};

// Variable to keep track of the current displayed count for Gateway 2
let displayedGateway2Count = 0;

// Update the individual gateway counts at regular intervals

// Function to format the scan duration into a readable format
function formatDuration(durationInSeconds) {
  
  const hours = Math.floor((durationInSeconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((durationInSeconds % 3600) / 60);
  const seconds = Math.floor(durationInSeconds % 60);

  return ` ${hours}h ${minutes}m ${seconds}s`;
}
// Variables to measure scan time
let scanStartTime = null;
let allBeaconsScanned = false;

// Update the individual gateway counts at regular intervals
setInterval(() => {
  displayedGateway2Count = gatewayBeaconCount[gateway2Mac];
  gateway2CountElement.innerText = `Gateway 2 Beacons scanned: ${displayedGateway2Count}`;

  // Check if gateway2Count has reached 12
  if (displayedGateway2Count === 12) {
    const scanEndTime = new Date();
    const scanDuration = (scanEndTime - scanStartTime) / 1000; // in seconds
    console.log("Scan ended at:", scanEndTime);
    console.log("Total scan time:", scanDuration, "seconds");

    const formattedDuration = formatDuration(scanDuration);

    scanTimeElement.innerText = `Total Scan Time: ${formattedDuration}`;
    alert(`All 12 beacons scanned...}`); // Alert the user with the total scan time

    // Ensure the alert is only triggered once
    displayedGateway2Count = 0; // Reset count to avoid repeated alerts
  }
}, 10000); // Update every 10 seconds


// Function to calculate the distance based on RSSI
function calculateDistance(rssi) {
  return Math.pow(10, (RSSI_REF - rssi) / (10 * PATH_LOSS_EXPONENT));
}

// Update the RSSI values on the map
function updateRSSI(data) {
  // Check if data.obj is defined and is an array
  if (!Array.isArray(data.obj)) {
    console.error("Invalid data format:", data.obj);
    return;
  }

  clearTimeout(dataTimeout); // Clear the previous timeout
  dataTimeout = setTimeout(clearOldRSSIData, 20000); // Set a new timeout to clear old data after 20 seconds

  const newDetectedBeacons = new Set();
  const rssiThreshold = -75; // Set the RSSI threshold

  // Reset gateway beacon counts
  Object.keys(gatewayBeaconCount).forEach((gateway) => {
    gatewayBeaconCount[gateway] = 0;
  });

  data.obj.forEach((beacon) => {
    if (beacon.rssi > rssiThreshold) {
      const coordinates = beaconCoordinates[beacon.dmac];
      if (coordinates) {
        newDetectedBeacons.add(beacon.dmac);
        lastReceivedTimestamps[beacon.dmac] = Date.now(); // Update the last received timestamp

        // Add the RSSI value to the list for the beacon
        if (!rssiValues[beacon.dmac]) {
          rssiValues[beacon.dmac] = [];
        }
        rssiValues[beacon.dmac].push(beacon.rssi);

        // Calculate the average RSSI value
        const averageRSSI = rssiValues[beacon.dmac].reduce((a, b) => a + b, 0) / rssiValues[beacon.dmac].length;

        // Calculate the distance based on the average RSSI value
        const distance = calculateDistance(averageRSSI);

        const existingFeature = vectorSource
          .getFeatures()
          .find((feature) => feature.get("name") === beacon.dmac);

        // Determine the color based on RSSI value
        let color;
        if (averageRSSI > -50) {
          color = "green"; // Strong signal
        } else if (averageRSSI > -70) {
          color = "yellow"; // Moderate signal
        } else {
          color = "red"; // Weak signal
        }

        if (existingFeature) {
          existingFeature.set("rssi", averageRSSI);
          existingFeature.setGeometry(new Point(coordinates));

          // Update the style to reflect the new RSSI value and color
          existingFeature.setStyle(
            new Style({
              image: new Circle({
                radius: 10,
                fill: new Fill({
                  color: color,
                }),
                stroke: new Stroke({
                  color: "black",
                  width: 2,
                }),
              }),
              text: new Text({
                text: `Beacon ${macToNumberMap[beacon.dmac]}\nRSSI: ${averageRSSI.toFixed(0)}\nDist: ${distance.toFixed(2)}m`,
                font: "14px Calibri,sans-serif",
                fill: new Fill({
                  color: "#000",
                }),
                stroke: new Stroke({
                  color: "#fff",
                  width: 3,
                }),
                offsetY: -30, // Position text above the circle
              }),
            })
          );
        } else {
          const point = new Feature({
            geometry: new Point(coordinates),
            name: beacon.dmac,
            rssi: averageRSSI,
          });

          // Customize the style to display the beacon number and RSSI value as text
          point.setStyle(
            new Style({
              image: new Circle({
                radius: 10,
                fill: new Fill({
                  color: color,
                }),
                stroke: new Stroke({
                  color: "black",
                  width: 2,
                }),
              }),
              text: new Text({
                text: `Beacon ${macToNumberMap[beacon.dmac]}\nRSSI: ${averageRSSI.toFixed(0)}\nDist: ${distance.toFixed(2)}m`,
                font: "14px Calibri,sans-serif",
                fill: new Fill({
                  color: "#000",
                }),
                stroke: new Stroke({
                  color: "#fff",
                  width: 3,
                }),
                offsetY: -15, // Position text above the circle
              }),
            })
          );

          vectorSource.addFeature(point);
        }

        // Update the table with the new beacon data
        updateBeaconTable(beacon.dmac, macToNumberMap[beacon.dmac], averageRSSI.toFixed(0), distance.toFixed(2), data.gmac);

        // Update the beacon count for the corresponding gateway
        if (data.gmac === gateway1Mac) {
          gatewayBeaconCount[gateway1Mac] += 1;
        } else if (data.gmac === gateway2Mac) {
          gatewayBeaconCount[gateway2Mac] += 1;
        }
      }
    }
  });

  // Update detected beacons set
  detectedBeacons.clear();
  newDetectedBeacons.forEach((beacon) => detectedBeacons.add(beacon));

  // Update the beacon count
  const beaconCount = vectorSource.getFeatures().length;
  beaconCountElement.innerText = `Total Beacons scanned above threshold of -75: ${beaconCount}`;

  // Update the individual gateway counts
  gateway1CountElement.innerText = `Gateway 1 Beacons scanned: ${gatewayBeaconCount[gateway1Mac]}`;
  // Gateway 2 count is updated periodically in the setInterval function

  map.render();

  // Start the timer when the first beacon is detected
  if (beaconCount === 1 && !scanStartTime) {
    scanStartTime = new Date();
    console.log("Scan started at:", scanStartTime);
  }

  // Stop the timer when all 12 beacons are detected
  if (beaconCount === 12 && scanStartTime && !allBeaconsScanned) {
    const scanEndTime = new Date();
    const scanDuration = (scanEndTime - scanStartTime) / 1000; // in seconds
    console.log("Scan ended at:", scanEndTime);
    console.log("Total scan time:", scanDuration, "seconds");

    scanTimeElement.innerText = `Total Scan Time: ${scanDuration.toFixed(2)} seconds`;
    alert(`All 12 beacons scanned`); // Alert the user with the total scan time
    allBeaconsScanned = true; // Ensure the timer is only stopped once
  }
}

// Function to update the beacon table
function updateBeaconTable(mac, number, rssi, distance, gateway) {
  const timestamp = new Date().toLocaleTimeString(); // Get the current timestamp
  const existingRow = document.querySelector(`#beacon-table tr[data-mac="${mac}"]`);

  if (existingRow) {
    // Update the existing row with new data
    existingRow.cells[1].innerText = rssi;
    existingRow.cells[2].innerText = distance;
    existingRow.cells[3].innerText = timestamp;
    existingRow.cells[4].innerText = gateway;
  } else {
    // Create a new row for the new beacon
    const row = document.createElement("tr");
    row.dataset.mac = mac; // Set the MAC address as a data attribute

    const cellNumber = document.createElement("td");
    cellNumber.innerText = number;
    row.appendChild(cellNumber);

    const cellRSSI = document.createElement("td");
    cellRSSI.innerText = rssi;
    row.appendChild(cellRSSI);

    const cellDistance = document.createElement("td");
    cellDistance.innerText = distance;
    row.appendChild(cellDistance);

    const cellTimestamp = document.createElement("td");
    cellTimestamp.innerText = timestamp;
    row.appendChild(cellTimestamp);

    const cellGateway = document.createElement("td");
    cellGateway.innerText = gateway;
    row.appendChild(cellGateway);

    beaconTable.appendChild(row);
  }
}

// Function to clear old RSSI data
function clearOldRSSIData() {
  const currentTime = Date.now();
  const threshold = 20000; // 20 seconds

  detectedBeacons.forEach((mac) => {
    if (currentTime - lastReceivedTimestamps[mac] > threshold) {
      const feature = vectorSource.getFeatures().find((feature) => feature.get("name") === mac);
      if (feature) {
        vectorSource.removeFeature(feature);
      }
      detectedBeacons.delete(mac);
    }
  });

  // Update the beacon count
  const beaconCount = vectorSource.getFeatures().length;
  beaconCountElement.innerText = `Total Beacons scanned above threshold of -75: ${beaconCount}`;

  map.render();
}

map.on("rendercomplete", () => {
  // Triggered when the map rendering is complete
});