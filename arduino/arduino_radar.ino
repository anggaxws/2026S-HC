#include <Servo.h>

#define trigPin 8
#define echoPin 9

#define redPin 10
#define bluePin 11
#define greenPin 12

long duration;
int distance;

Servo myservo;

void setRed()
{
  digitalWrite(redPin, HIGH);
  digitalWrite(bluePin, LOW);
  digitalWrite(greenPin, LOW);
}

void setBlue()
{
  digitalWrite(redPin, LOW);
  digitalWrite(bluePin, HIGH);
  digitalWrite(greenPin, LOW);
}

void setGreen()
{
  digitalWrite(redPin, LOW);
  digitalWrite(bluePin, LOW);
  digitalWrite(greenPin, HIGH);
}

void updateRGBLight(int objectDistance)
{
  if (objectDistance > 0 && objectDistance < 30)
  {
    setRed();
  }
  else if (objectDistance >= 30 && objectDistance <= 60)
  {
    setBlue();
  }
  else if (objectDistance > 60)
  {
    setGreen();
  }
}

int calculateDistance()
{
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);

  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);

  digitalWrite(trigPin, LOW);

  duration = pulseIn(echoPin, HIGH, 20000);
  distance = duration * 0.034 / 2;

  return distance;
}

void setup()
{
  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);

  pinMode(redPin, OUTPUT);
  pinMode(bluePin, OUTPUT);
  pinMode(greenPin, OUTPUT);

  myservo.attach(4);

  Serial.begin(9600);
}

void loop()
{
  int angle;

  for (angle = 15; angle <= 180; angle++)
  {
    myservo.write(angle);
    delay(25);

    calculateDistance();
    updateRGBLight(distance);

    Serial.print(angle);
    Serial.print(",");
    Serial.print(distance);
    Serial.print(".");
    Serial.println();
  }

  for (angle = 180; angle >= 15; angle--)
  {
    myservo.write(angle);
    delay(25);

    calculateDistance();
    updateRGBLight(distance);

    Serial.print(angle);
    Serial.print(",");
    Serial.print(distance);
    Serial.print(".");
    Serial.println();
  }
}
