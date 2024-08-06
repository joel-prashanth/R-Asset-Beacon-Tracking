// Define a class for the data points
class DataPoint {
  constructor(gmac, dmac, rssi, temp, timestamp, rssiAvg) {
    this.gmac = gmac; // MAC address of the gateway
    this.dmac = dmac; // MAC address of the scanned beacon
    this.rssi = rssi; // Received Signal Strength Indicator
    this.temp = temp; // Temperature
    this.timestamp = timestamp; // Readable timestamp of the data point
    this.rssiAvg = rssiAvg; // Average RSSI for the last N data points of the gateway
  }
}

// Desired number of objects to collect
const DESIRED_COUNT = 10; // This value will be used for the sliding window size
const TOTAL_SAMPLES = 10000; // Total samples to collect
let collectedObjects = [];
let gatewayRssiValues = {}; // Object to store the last N RSSI values per gateway

// Connect to the WebSocket server
const ws = new WebSocket('ws://localhost:9002');

ws.onopen = () => {
  console.log('Connected to WebSocket server');
  
  // Start the first processing cycle
  scheduleProcessing();
};

ws.onmessage = (event) => {
  try {
    const { topic, message } = JSON.parse(event.data);
    if (topic === 'Honda' && Array.isArray(message.obj) && message.obj.length > 0) {
      const gmac = message.gmac; // Extract the gateway MAC address
      
      // Filter out any empty objects before creating DataPoint instances
      const validObjects = message.obj.filter(obj => obj && Object.keys(obj).length > 0);
      
      // Collect only the desired number of objects
      validObjects.forEach(obj => {
        const timestamp = new Date().toLocaleString(); // Get the current date and time in a readable format
        
        // Initialize the gateway's RSSI values array if it doesn't exist
        if (!gatewayRssiValues[gmac]) {
          gatewayRssiValues[gmac] = [];
        }
        
        // Add the current RSSI value to the gateway's array
        gatewayRssiValues[gmac].push(obj.rssi);
        
        // Keep only the last DESIRED_COUNT RSSI values
        if (gatewayRssiValues[gmac].length > DESIRED_COUNT) {
          gatewayRssiValues[gmac].shift(); // Remove the oldest value if exceeding the desired count
        }
        
        // Calculate the average RSSI for the last DESIRED_COUNT values
        const rssiAvg = calculateAverageRssi(gmac);
        
        const dataPoint = new DataPoint(
          gmac,
          obj.dmac,      // Scanned beacon MAC address
          obj.rssi,      // RSSI value
          obj.temp,      // Temperature
          timestamp,     // Capture the current timestamp in a readable format
          rssiAvg        // Average RSSI for the last DESIRED_COUNT values
        );
        collectedObjects.push(dataPoint);
        
        // Check if we have collected enough samples
        if (collectedObjects.length >= TOTAL_SAMPLES) {
          exportToExcel(collectedObjects);
          collectedObjects = [];
          gatewayRssiValues = {};
        }
      });
    }
  } catch (err) {
    console.error('Error parsing WebSocket message:', err);
  }
};

ws.onerror = (err) => {
  console.error('WebSocket error:', err);
};

ws.onclose = () => {
  console.log('WebSocket connection closed');
};

// Function to process collected objects every minute
function processCollectedObjects() {
  // No need to process collected objects here since we are exporting immediately
}

// Function to schedule the next processing after 1 minute
function scheduleProcessing() {
  setTimeout(processCollectedObjects, 60000); // Schedule processing after 60000 milliseconds (1 minute)
}

// Function to calculate the average RSSI for the last N values of a gateway
function calculateAverageRssi(gmac) {
  const rssiValues = gatewayRssiValues[gmac] || [];
  const sum = rssiValues.reduce((total, value) => total + value, 0);
  const average = rssiValues.length > 0 ? sum / rssiValues.length : null;
  
  // Round the average to zero decimal places
  return average !== null ? Math.round(average) : null;
}

// Function to export collected data to Excel
function exportToExcel(dataPoints) {
  const worksheetData = dataPoints.map(dp => ({
    Gateway: dp.gmac,
    Beacon: dp.dmac,
    Time: dp.timestamp,
    RSSI: dp.rssi,        // Add RSSI value here
    "Average RSSI": dp.rssiAvg
  }));

  const worksheet = XLSX.utils.json_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "DataPoints");

  // Generate a file name based on the current date and time
  const fileName = `DataPoints_${new Date().toISOString().split('T')[0]}.xlsx`;
  
  // Save the workbook to a file
  XLSX.writeFile(workbook, fileName);

  console.log(`Exported ${TOTAL_SAMPLES} data points to ${fileName}`);
}
