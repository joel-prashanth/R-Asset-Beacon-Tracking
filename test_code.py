import paho.mqtt.client as mqtt
import json
import pprint
from collections import defaultdict
from threading import Timer

# Data structure to store RSSI values
gateway_data = defaultdict(list)

# Timer interval in seconds (1 minute)
TIMER_INTERVAL = 60

# Function to print and clear RSSI data every minute
def print_and_clear_data():
    print("\nAveraged RSSI values for the past minute:")
    for gateway, rssi_values in gateway_data.items():
        if rssi_values:
            avg_rssi = sum(rssi_values) / len(rssi_values)
            print(f"GATEWAY: {gateway}, Averaged RSSI: {avg_rssi}")
        else:
            print(f"GATEWAY: {gateway}, No RSSI values received")
    # Clear the data after printing
    gateway_data.clear()
    # Restart the timer
    Timer(TIMER_INTERVAL, print_and_clear_data).start()

# Define the callback function that will be called when a message is received
def on_message(client, userdata, message):
    payload = message.payload.decode('utf-8')
    print("Message received:")
    
    # Parse the payload to extract RSSI values based on your data structure
    data = json.loads(payload)
    
    # Pretty print the received data
    pprint.pprint(data)
    
    gateway_mac_id = data.get("gmac")
    rssi = data['obj'][0].get("rssi") if data.get("obj") else None
    
    if gateway_mac_id in ["94A408B06608", "94A408B03D34", "94A408B08890"]:
        gateway_data[gateway_mac_id].append(rssi)
        print(f"GATEWAY: {gateway_mac_id}, RSSI: {rssi}\n")

# Define the callback function that will be called when the client connects to the broker
def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print("Connected successfully")
        client.subscribe("Honda")
    else:
        print(f"Connection failed with code {rc}")

# Create an MQTT client instance
client = mqtt.Client()

# Assign the on_connect and on_message callback functions
client.on_connect = on_connect
client.on_message = on_message

# Start the periodic printing and clearing of data
Timer(TIMER_INTERVAL, print_and_clear_data).start()

# Connect to the MQTT server
client.connect("13.126.132.166", 1883, 60)

# Start the MQTT client loop to process network traffic and dispatch callbacks
client.loop_forever()
