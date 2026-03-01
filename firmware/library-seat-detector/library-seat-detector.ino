const float R_SERIES = 10000.0;
const float R0 = 10000.0;
const float T0 = 298.15;
const float B = 3950.0;

const float BODY_TEMP_MIN = 32.0;
const float BODY_TEMP_MAX = 38.0;

// Channel 1: A3 = FSR, A5 = NTC
const int FSR_PIN_CH1 = A3;
const int NTC_PIN_CH1 = A5;

void setup() {
  Serial.begin(9600);
}

int readFSR() {
  return analogRead(FSR_PIN_CH1);
}

float readTemperatureC() {
  int raw = analogRead(NTC_PIN_CH1);
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
  static int lastFsr = -1;

  float tempC = readTemperatureC();
  const char* status = getStatus(tempC);
  int fsr = readFSR();

  if (tempC != lastTempC || status != lastStatus || fsr != lastFsr) {
    lastTempC = tempC;
    lastStatus = status;
    lastFsr = fsr;

    Serial.print("{\"temp\":");
    Serial.print(tempC, 1);
    Serial.print(",\"status\":\"");
    Serial.print(status);
    Serial.print("\",\"fsr\":");
    Serial.print(fsr);
    Serial.print(",\"channel\":1}");
    Serial.println();
  }

  delay(500);
}