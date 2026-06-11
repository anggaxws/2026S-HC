# Abgabe 1 - Project Report / Heterogeneous Computing

## Project Introduction

This project is a simple real-time radar monitoring system built with an Arduino-based sensor unit and a web dashboard. The Arduino controls a mini servo motor and an ultrasonic sensor to scan the surroundings across a range of angles. The measured distance data is then sent over serial communication to a Node.js server, which forwards the readings to a browser dashboard for live visualization.

The result is a small radar style system that can detect nearby objects, show their position based on angle and distance, and present supporting analytics through a clean web interface.

## Hardware Used

- Arduino Uno
- Breadboard
- Mini servo motor
- Ultrasonic sensor
- RGB LED outputs from the Arduino sketch
- Jumper wires and USB connection to the computer

Based on the code, the ultrasonic sensor is connected through:

- `trigPin` on pin `8`
- `echoPin` on pin `9`

The RGB indicator uses:

- `redPin` on pin `10`
- `bluePin` on pin `11`
- `greenPin` on pin `12`

The servo motor is attached to:

- Servo signal on pin `4`

## System Architecture

The project is divided into two main parts:

1. Arduino sensing and motion control
2. Web dashboard visualization

### Data Flow

1. The servo rotates from `15` degrees to `180` degrees and back.
2. At each angle, the ultrasonic sensor measures the object distance.
3. The Arduino sends the reading in serial format:

```text
angle,distance.
```

Example:

```text
90,42.
```

4. The Node.js backend reads the serial data from the selected COM port.
5. The backend parses the data and sends it to connected web clients using Socket.IO.
6. The browser dashboard updates the radar view, distance chart, and analytics panels in real time.

## Arduino Implementation

The Arduino program is stored in [arduino/arduino_radar.ino]

### Main Functions

#### 1. Distance Measurement

The ultrasonic sensor is triggered by sending a short pulse on `trigPin`. The return pulse on `echoPin` is measured using `pulseIn()`, and the distance is calculated using the standard ultrasonic formula:

```text
distance = duration * 0.034 / 2
```

This converts sound travel time into distance in centimeters.

#### 2. Servo Sweep

The servo continuously sweeps:

- forward from `15` to `180` degrees
- backward from `180` to `15` degrees

This creates the radar scanning motion.

#### 3. RGB Distance Indication

The Arduino sketch also controls RGB LEDs based on detected distance:

- Red: object is closer than `30 cm`
- Blue: object is between `30 cm` and `60 cm`
- Green: object is farther than `60 cm`

This gives a simple local visual indicator even without looking at the dashboard.

#### 4. Serial Output

For each servo position, the Arduino prints:

```text
angle,distance.
```

The dashboard backend depends on this format to parse incoming readings correctly.

## Dashboard Implementation

The dashboard is built with:

- Node.js
- Express
- Socket.IO
- HTML, CSS, and JavaScript
- Chart.js

### Backend

The backend is implemented in [server.js]

Its responsibilities are:

- serve the frontend files from the `public` folder
- open the serial connection to the Arduino
- read incoming serial lines
- parse angle and distance values
- validate the values
- broadcast the readings to the browser through WebSockets

The server currently expects:

- default serial port from `SERIAL_PORT` or fallback `COM8`
- baud rate `9600`
- angle range from `15` to `180`
- distance range from `1` to `300 cm`

### Frontend

The frontend is implemented mainly in:

- [public/index.html]
- [public/styles.css]
- [public/script.js]

### Frontend Features

#### 1. Radar View

The radar panel draws:

- semicircle guide rings
- angle guide lines
- current sweep line
- detected object points
- text labels for angle and distance reference

The radar is rendered on an HTML `<canvas>` and resized responsively to fit the panel.

#### 2. Live Analytics

The analytics panel shows:

- closest detected object
- current distance information
- most active zone
- zone occupancy counts

The zone breakdown divides detections into:

- left
- center
- right

#### 3. Angle Activity

The dashboard groups detections into angle buckets to show where most readings occur during the scan.

#### 4. Distance Tracking

The line chart displays distance changes over time using Chart.js. This makes it easier to observe movement trends and repeated detection patterns.

## Communication Between Arduino and Dashboard

The Arduino and dashboard are connected through serial communication. The browser does not communicate with the Arduino directly. Instead:

1. Arduino sends serial data to the computer.
2. Node.js receives and parses the data.
3. Socket.IO pushes the processed reading to the browser.

This design keeps hardware handling in the backend and visualization in the frontend, making the system easier to maintain and extend.

## Implementation Summary

This project combines embedded control and web visualization in a simple heterogeneous system:

- the Arduino Uno handles sensing, motor control, and LED feedback
- the Node.js backend handles serial communication and data forwarding
- the browser dashboard handles real-time visualization and analytics

The implementation demonstrates how physical sensor data can be transformed into a live interactive dashboard with relatively simple hardware and web technologies.

## Conclusion

The Arduino Radar Dashboard project successfully integrates hardware and software into a real-time object detection system. Using an ultrasonic sensor and a servo motor, the Arduino performs a scanning motion similar to radar. The measured results are transmitted to a web dashboard where they are displayed visually and analytically.
