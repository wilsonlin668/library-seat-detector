const float R_SERIES = 10000.0;
const float R0 = 10000.0;
const float T0 = 298.15;
const float B = 3950.0;

const float BODY_TEMP_MIN = 34.0;
const float BODY_TEMP_MAX = 38.0;

void setup() {
  Serial.begin(9600);
}

float readTemperatureC() {
  int raw = analogRead(A5);
  if (raw >= 1022) return 999.0;
  if (raw <= 1) return -999.0;

  float voltage = raw * (5.0 / 1023.0);
  float rTherm = R_SERIES * (5.0 - voltage) / voltage;
  float steinhart = log(rTherm / R0) / B + 1.0 / T0;
  float tempK = 1.0 / steinhart;
  return tempK - 273.15;
}

const char* getStatus(float tempC) {
  if (tempC >= BODY_TEMP_MIN && tempC <= BODY_TEMP_MAX) return "body_detected";
  if (tempC > -100 && tempC < 100) return "ambient";
  return "error";
}

void loop() {
  static float lastTempC = -999.0;
  static const char* lastStatus = "";

  float tempC = readTemperatureC();
  const char* status = getStatus(tempC);

  if (tempC != lastTempC || status != lastStatus) {
    lastTempC = tempC;
    lastStatus = status;

    Serial.print("{\"temp\":");
    Serial.print(tempC, 1);
    Serial.print(",\"status\":\"");
    Serial.print(status);
    Serial.println("\"}");
  }

  delay(500);
}