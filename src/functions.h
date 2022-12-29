#include <Arduino.h>
#include <ModbusRTU.h>
#include <ESP8266WiFi.h>
#include <ESPAsyncTCP.h>
#include <SoftwareSerial.h>
#include <ESPAsyncWebServer.h>
#include <FS.h>
#include <LittleFS.h>
#include <ModbusRTU.h>
#include <SoftwareSerial.h>
#include <ArduinoJson.h>

#ifndef FUNCTIONS_H_
#define FUNCTIONS_H_

// receivePin = RO , transmitPin = DI , inverse_logic, bufSize, isrBufSize
SoftwareSerial S(D1, D4);
ModbusRTU mb;

AsyncWebServer server(80);
AsyncEventSource events("/events");

StaticJsonDocument<500> json_doc; // JSON file object
const int analogInPin = A0;       // ESP8266 Analog Pin ADC0 = A0

// parameteri declarati ca variabile globale
unsigned long lastTime = 0;
unsigned long timerDelay = 120000; // send readings timer

uint16_t databits, stopBits; // for future development
uint16_t functionCode;       // for future development

char parity; // for future development

uint16_t baud_rate = 9600;
uint16_t serverAddress = 1;

uint16_t startAddressReadCoils = 1;
uint16_t startAddressWriteCoils;
uint16_t coilCountRead;
uint16_t coilCountWrite;
bool valueToWriteCoil;

uint16_t startAddressReadRegisters = 0;
uint16_t regCount = 1;

float voltage = 0; // value read

uint16_t mb_response;      // store the modbus server response
uint16_t transaction_code; // store the code that indicates the transaction status

#endif

void wifi_start();   // start the wifi access point
void server_start(); // start the web server ierface

void server_settings(); // process the Settings tab requests

// send the request to modbus slave, lisen, process response
void send_modbus_readCoil(uint16_t startAddressReadCoils, uint16_t coilCountRead);     // function code 01
void send_modbus_readDiscrete(uint16_t startAddressReadCoils, uint16_t coilCountRead); // function code 02
void send_modbus_readHolding(uint16_t startAddressReadRegisters, uint16_t regCount);   // function code 03
void send_modbus_readInput(uint16_t startAddressReadRegisters, uint16_t regCount);     // function code 04 ??? verifica daca is corecte

void send_modbus_writeCoil(uint16_t startAddressWriteCoils, bool valueToWriteCoil); // function code $05

void notFound(AsyncWebServerRequest *request); // in case the web page requested is not found

void adc_read(); // read the battery voltage

void modbus_start();                                                   // start the modbus connection
bool cb(Modbus::ResultCode event, uint16_t transactionId, void *data); // print in serial command the modbus errors events,
                                                                       // to be future defined

String processor(const String &var); // convert values from int to string to be sent to web interface
                                     // where only strings are accepted

void server_readCoils();    // process the readCoils function tab request
void server_readDiscrete(); // process the readDiscrete function tab request
void server_readHolding();  // process the readHolding function tab request
void server_readInput();    // process the readInput function tab request
void server_writeCoils();   // process the writeCoils function tab request

void wifi_start()
{
    const char *ssid = "HUAWEI-1AN1IZ";
    const char *password = "Huawei12345";

    // const char *ssid = "Mihai.Str";
    // const char *password = "";

    WiFi.begin(ssid, password);
    Serial.println("");
    // Wait for connection
    while (WiFi.status() != WL_CONNECTED)
    {
        delay(500);
        Serial.print(".");
    }
    Serial.println("");
    Serial.print("Connected to ");
    Serial.println(ssid);
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());

    // todo:
    // wireless connection
    // const char *ssid = "Controller ModbusRS485";
    // const char *password = "";
    // WiFi.softAP(ssid, password);
    // IPAddress IP = WiFi.softAPIP();

    // Serial.print("AP IP address: ");
    // Serial.println(IP);
}

void server_start()
{
    if (!LittleFS.begin())
    {
        Serial.println("An Error has occurred while mounting LittleFS");
        return;
    }

    server.on("/", HTTP_GET, [](AsyncWebServerRequest *request)
              { request->send(LittleFS, "/interfata_grafica.html",
                              String(), false, processor); });

    server.on("/style.css", HTTP_GET, [](AsyncWebServerRequest *request)
              { request->send(LittleFS, "/style.css"); });

    server.on("/scripts.js", HTTP_GET, [](AsyncWebServerRequest *request)
              { request->send(LittleFS, "/scripts.js"); });
}

void server_settings()
{
    // settings?serverAddress=1&baud_rate=9600&databits=8&parity=even&stopBits=1
    server.on("/settings", HTTP_GET, [](AsyncWebServerRequest *request)
              {   
                // atribuire valorile parametrilor 
                serverAddress = request->getParam(0)->value().toInt();
                baud_rate = request->getParam(1)->value().toInt();
                databits = request->getParam(2)->value().toInt();
                stopBits = request->getParam(4)->value().toInt();

                Serial.println("serverAddress:"); // print in serial command for debug reasons
                Serial.println(serverAddress);
                Serial.println("baudrate:");
                Serial.println(baud_rate);
                                             
                // reincarcare interfata web
                request->send(LittleFS, "/interfata_grafica.html", String(), false, processor); });
}

void server_readCoils()
{
    // readCoils?startAddressReadCoils=0&readcoilCountRead=1
    server.on("/readCoils", HTTP_GET, [](AsyncWebServerRequest *request)
              {
              startAddressReadCoils = request->getParam(0)->value().toInt();
              coilCountRead = request->getParam(1)->value().toInt();
            
              Serial.println("startAddressReadCoils"); // print in serial command for debug reasons
              Serial.println(startAddressReadCoils);
              Serial.println("coilCountRead");
              Serial.println(coilCountRead);

              send_modbus_readCoil(startAddressReadCoils,coilCountRead);

        AsyncResponseStream *response = request->beginResponseStream("application/json");
        serializeJson(json_doc, *response);
        request->send(response); });
}

void server_readDiscrete()
{
    // readDiscrete?startAddressReadCoils=0&coilCountRead=1;
    server.on("/readDiscrete", HTTP_GET, [](AsyncWebServerRequest *request)
              {
              startAddressReadCoils = request->getParam(0)->value().toInt();
              coilCountRead = request->getParam(1)->value().toInt();
            
              send_modbus_readDiscrete(startAddressReadCoils,coilCountRead);

        AsyncResponseStream *response = request->beginResponseStream("application/json");
        serializeJson(json_doc, *response);
        request->send(response); });
}

void server_readHolding()
{
    // readHolding?startAddressReadRegisters=2&regCount=4
    server.on("/readHolding", HTTP_GET, [](AsyncWebServerRequest *request)
              {
        startAddressReadRegisters = request->getParam(0)->value().toInt();
        regCount = request->getParam(1)->value().toInt();

        send_modbus_readHolding(startAddressReadRegisters, regCount);

        // todo: documentatie JSON
        AsyncResponseStream *response = request->beginResponseStream("application/json");
        serializeJson(json_doc, *response);
        request->send(response); });
}

void server_readInput()
{
    // /readInput?startAddressReadRegisters=0&regCount=2
    server.on("/readInput", HTTP_GET, [](AsyncWebServerRequest *request)
              {
        startAddressReadRegisters = request->getParam(0)->value().toInt();
        regCount = request->getParam(1)->value().toInt();

        send_modbus_readInput(startAddressReadRegisters, regCount);

        // todo: documentatie JSON
        AsyncResponseStream *response = request->beginResponseStream("application/json");
        serializeJson(json_doc, *response);
        request->send(response); });
}

void server_writeCoils()
{
    // writeCoils?startAddressWriteCoils=0&coilCountWrite=1&valueToWriteCoil=0;
    server.on("/writeCoils", HTTP_GET, [](AsyncWebServerRequest *request)
              {
              startAddressWriteCoils = request->getParam(0)->value().toInt();
              coilCountWrite = request->getParam(1)->value().toInt();
              if (request->getParam(2)->value().toInt())
              valueToWriteCoil = 1;
              else
              valueToWriteCoil = 0;

              Serial.println("startAddressWriteCoils"); // print in serial command for debug reasons
              Serial.println(startAddressWriteCoils);
              Serial.println("coilCountWrite");
              Serial.println(coilCountWrite);
              Serial.println("valueToWriteCoil");
              Serial.println(valueToWriteCoil);

              send_modbus_writeCoil(startAddressWriteCoils,valueToWriteCoil);

        AsyncResponseStream *response = request->beginResponseStream("application/json");
        serializeJson(json_doc, *response);
        request->send(response); });
}

void notFound(AsyncWebServerRequest *request)
{
    request->send(404, "text/plain", "Not found");
}

void adc_read()
{
    // read the analog in value * voltage divider constant
    voltage = ((analogRead(analogInPin) * 3.3) / 1023.0) / 0.232325581395348;
}

void modbus_start()
{
    S.setTransmitEnablePin(D0);       // set D0 as Drive enable Receive Enable
    S.begin(baud_rate, SWSERIAL_8E1); // set baudrate and serial paramteres
    mb.begin(&S);                     // start modbus conextion

    mb.master(); // set uC as modbus master
}

bool cb(Modbus::ResultCode event, uint16_t transactionId, void *data)
{ // Callback to monitor errors
    transaction_code = event;
    switch (event)
    {
    case Modbus::EX_SUCCESS: // no modbus error
        Serial.println("\n");
        Serial.print("Transaction code: 0x");
        Serial.print(event, HEX);
        Serial.print(" -> Transaction successful");
        break;
    case Modbus::EX_TIMEOUT: // response not arrived in the expected time
        Serial.println("\n");
        Serial.print("Transaction code: 0x");
        Serial.print(event, HEX);
        Serial.print(" -> Response timeout expired");
        break;
    case Modbus::EX_ILLEGAL_ADDRESS: // requested address not in accessible range
        Serial.println("\n");
        Serial.print("Transaction code: 0x");
        Serial.print(event, HEX);
        Serial.print(" -> Output Address not in Range");
        break;
    case Modbus::EX_ILLEGAL_VALUE:
        Serial.println("\n");
        Serial.print("Transaction code: 0x");
        Serial.print(event, HEX);
        Serial.print(" -> Output Value not in Range");
        break;
    case Modbus::EX_SLAVE_FAILURE:
        Serial.println("\n");
        Serial.print("Transaction code: 0x");
        Serial.print(event, HEX);
        Serial.print(" -> Slave or Master Device Fails to process request");
        break;
    default:
        break;
    }
    return true;
}

void send_modbus_readCoil(uint16_t startAddressReadCoils, uint16_t coilCountRead)
{
    bool coils[coilCountRead];

    if (!mb.slave())
    { // send modbus function code $01
        mb.readCoil(serverAddress, startAddressReadCoils, coils, coilCountRead, cb);

        while (mb.slave())
        { // Check if transaction is active
            mb.task();
            delay(10);
        }
        Serial.println("\n");
        Serial.printf("Request response = %.2d \n", coils[0]);
        Serial.println();

        if (transaction_code != 0)
        { // sent to frontend the modbus response value
            json_doc["transaction_code"] = transaction_code;
            json_doc["slaveCoils"] = NULL;
        }
        else
        {
            json_doc["transaction_code"] = transaction_code;
            // Create the array that stores the values
            JsonArray valoareRegistrii = json_doc.createNestedArray("slaveCoils");
            for (int i = 0; i < coilCountRead; i++)
            {
                // Add the value at the end of the array
                valoareRegistrii.add(coils[i]);
            }
        }
    }
}

void send_modbus_readDiscrete(uint16_t startAddressReadCoils, uint16_t coilCountRead)
{
    bool discrete[coilCountRead];

    if (!mb.slave())
    { // send modbus function code $02
        mb.readIsts(serverAddress, startAddressReadCoils, discrete, coilCountRead, cb);

        while (mb.slave())
        { // Check if transaction is active
            mb.task();
            delay(10);
        }

        if (transaction_code != 0)
        { // sent to frontend the modbus response value
            json_doc["transaction_code"] = transaction_code;
            json_doc["slaveCoils"] = NULL;
        }
        else
        {
            json_doc["transaction_code"] = transaction_code;
            // Create the array that stores the values
            JsonArray valoareRegistrii = json_doc.createNestedArray("slaveDiscrete");
            for (int i = 0; i < coilCountRead; i++)
            {
                // Add the value at the end of the array
                valoareRegistrii.add(discrete[i]);
            }
        }
    }
}

void send_modbus_readHolding(uint16_t startAddressReadRegisters, uint16_t regCount)
{
    uint16_t res[regCount];
    if (!mb.slave())
    {                                                                             // send modbus function code $03
        mb.readHreg(serverAddress, startAddressReadRegisters, res, regCount, cb); // Send Read Hreg from Modbus Server

        // Check if no transaction in progress
        while (mb.slave())
        { // Check if transaction is active
            mb.task();
            delay(10);
        }
        Serial.println("\n");
        Serial.printf("Request response = %.2d \n", res[0]);
        Serial.println();

        if (transaction_code != 0)
        { // sent to frontend the modbus response value
            json_doc["transaction_code"] = transaction_code;
            json_doc["slaveHolding"] = NULL;
        }
        else
        {
            json_doc["transaction_code"] = transaction_code;
            // Create the array that stores the values
            JsonArray valoareRegistrii = json_doc.createNestedArray("slaveHolding");
            for (int i = 0; i < regCount; i++)
            {
                // Add the value at the end of the array
                valoareRegistrii.add(res[i]);
            }
        }
    }
}

void send_modbus_readInput(uint16_t startAddressReadRegisters, uint16_t regCount)
{
    uint16_t res[regCount];
    if (!mb.slave())
    {                                                                             // send modbus function code $04???
        mb.readIreg(serverAddress, startAddressReadRegisters, res, regCount, cb); // Send Read IReg from Modbus Server

        // Check if no transaction in progress
        while (mb.slave())
        { // Check if transaction is active
            mb.task();
            delay(10);
        }

        if (transaction_code != 0)
        { // sent to frontend the modbus response value
            json_doc["transaction_code"] = transaction_code;
            json_doc["slaveHolding"] = NULL;
        }
        else
        {
            json_doc["transaction_code"] = transaction_code;
            // Create the array that stores the values
            JsonArray valoareRegistrii = json_doc.createNestedArray("slaveInput");
            for (int i = 0; i < regCount; i++)
            {
                // Add the value at the end of the array
                valoareRegistrii.add(res[i]);
            }
        }
    }
}

void send_modbus_writeCoil(uint16_t startAddressWriteCoils, bool valueToWriteCoil)
{ /*
!!! ATENTIE Variabila valueToWriteCoil isi schimba rolul !!! Comportament observat - NU stiu de ce e asa.
Prima data are rolul de a stoca valoarea check-boxului din fronted
checked => 1 , unchecked => 0
Apoi se apeleaza functia din libraria de modbus pentru scrierea Coil.

Dupa ce s-a trimis cererea modbus catre slave acesta raspunde cu valoarea pe care o are Coils dupa scriere.
Asemanator cu ce face butonul de Read Coils. Citeste starea Coils.
Valoarea primita va fi stocata in variabila valueToWriteCoil. Aceasta is va schimba astfel valoarea pe care o avea inainte
de a fi trimisa cererea.
*/
    uint16_t coilCountWrite = 1;
    bool coils[coilCountWrite];

    if (!mb.slave())
    { // send modbus function code $05

        mb.writeCoil(serverAddress, startAddressWriteCoils, valueToWriteCoil, cb);

        while (mb.slave())
        { // Check if transaction is active
            mb.task();
            delay(10);
        }

        Serial.println("\n");
        Serial.printf("Request response = %.2d \n", valueToWriteCoil);
        Serial.println();

        if (transaction_code != 0)
        { // sent to frontend the modbus response value
            json_doc["transaction_code"] = transaction_code;
            json_doc["slaveCoils"] = NULL;
        }
        else
        {
            json_doc["transaction_code"] = transaction_code;
            // Create the array that stores the values
            JsonArray valoareRegistrii = json_doc.createNestedArray("slaveCoils");
            for (int i = 0; i < coilCountWrite; i++)
            {
                // Add the value at the end of the array
                valoareRegistrii.add(coils[i]);
            }
        }
    }
}

String processor(const String &var)
{
    adc_read();

    if (var == "VOLTAGE")
    {
        return String(voltage);
    }

    return String();
}
