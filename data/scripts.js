// functions for page dynamics

/* Create buttons to open specific tab content. 
All <div> elements with class="tabcontent" are hidden by default (with CSS & JS). 
When the user clicks on a button - it will open the tab content that "matches" this button. */
function openTab(evt, tabName) {
  var i, tabcontent, tablinks;
  // Get all elements with class="tabcontent" and hide them
  tabcontent = document.getElementsByClassName("tabcontent");
  for (i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = "none";
  }
  // Get all elements with class="tablinks" and remove the class "active"
  tablinks = document.getElementsByClassName("tablinks");
  for (i = 0; i < tablinks.length; i++) {
    tablinks[i].className = tablinks[i].className.replace(" active", "");
  }
  // Show the current tab, and add an "active" class to the button that opened the tab
  document.getElementById(tabName).style.display = "block";
  evt.currentTarget.className += " active";
}
// Get the element with id="defaultOpen" and click on it
function default_open() {
  document.getElementById("defaultOpen").click();
}

// functions for page actions

function startup() {  // things that needs to be set at startup

  // block the default behavior (refresh) of the buttons
  document.getElementById("button_readCoils").addEventListener("click", function (event) {
    event.preventDefault()
  });

  document.getElementById("button_readDiscrete").addEventListener("click", function (event) {
    event.preventDefault()
  });

  document.getElementById("button_readHolding").addEventListener("click", function (event) {
    event.preventDefault()
  });

  document.getElementById("button_readInput").addEventListener("click", function (event) {
    event.preventDefault()
  });

  if (!!window.EventSource) {
    var source = new EventSource('/events');

    //  * still in use to print when device is connected
    source.addEventListener('open', function (e) {
      console.log("Events Connected");
    }, false);

    source.addEventListener('error', function (e) {
      if (e.target.readyState != EventSource.OPEN) {
        console.log("Events Disconnected");
      }
    }, false);

    // * still in use to send battery voltage
    source.addEventListener('voltage', function (e) {
      console.log("voltage", e.data);
      document.getElementById("batteryVoltage").value = e.data;
    }, false);

  }

}

function timestamp() {  // get timestamp value

  let currentDate = new Date();
  let time = currentDate.getHours() + ":" + currentDate.getMinutes() + ":" + currentDate.getSeconds();
  return time;
}

function update_consola(item_id, item_value) {  // print in console the action

  document.getElementById("consola").value += timestamp() + " ---> " + item_id + " = " + item_value + "\n";
  document.getElementById("consola").scrollTop = document.getElementById("consola").scrollHeight; //autoscroll
}

function update_checkbox_label(item_value) { // get the label of checkbox to match with the start adress of coil

  document.getElementById("label_checkbox0").innerHTML = "Coil " + item_value;
  console.log("Coil " + item_value)
}

function update_register_number_label(item_value) { // get the label of register number box to match with the start adress of register
  document.getElementById("label_numberRegisterValue").innerHTML = "Register " + item_value;
  console.log("Register " + item_value)
}

// functinons to show the requested answer form slave
function afisare_transaction_code(parametru) {  // Exception Codes
  // print cod succes sau eroare
  // parametru values are from modbus library error handling

  let text_raspuns_cerere;

  switch (parametru) {
    case 0:
      text_raspuns_cerere = "Transaction successful";
      break;

    case 228:
      text_raspuns_cerere = "Response timeout expired";
      break;

    case 2:
      text_raspuns_cerere = "Output Address not in Range";
      break;

    case 3:
      text_raspuns_cerere = "Output Value not in Range";
      break;

    case 4:
      text_raspuns_cerere = "Slave or Master Device Fails to process request";
      break;
  }

  document.getElementById("consola").value += timestamp() + " DONE: " + text_raspuns_cerere + "\n";
  document.getElementById("consola").scrollTop = document.getElementById("consola").scrollHeight; //autoscroll

}

function afisare_raspuns_primit(item_type, item_number, item_value) {   // print in console the modbus response value 
  // item_type  = coil or registru (register)
  // item_number = register number 
  // item_value = actual register value

  document.getElementById("consola").value += timestamp() + " ---> " + "Valoare " + item_type + " " + item_number + ": " + item_value + "\n";
  document.getElementById("consola").scrollTop = document.getElementById("consola").scrollHeight; //autoscroll
}

// functions to send request to backend
async function fetchCoilsValue() {   // trimitere cerere catre backend pentru citirea de coils
  // send request to backend for read coils

  let startAddressReadCoils = document.getElementById("startAddressReadCoils").value;
  let coilCountRead = document.getElementById("coilCountRead").value;

  document.getElementById("consola").value += timestamp() + " INIT: Read " + coilCountRead + " coils starting from: " + startAddressReadCoils + "\n";

  //readCoils?startAddressReadCoils=0&coilCountRead=1;
  let url = "/readCoils?startAddressReadCoils=" + startAddressReadCoils + "&coilCountRead=" + coilCountRead;
  let response = await fetch(url);

  if (response.ok) { // if HTTP-status is 200-299

    let resultJSON = await response.json();

    afisare_transaction_code(resultJSON.transaction_code);

    for (let i = 0; i < resultJSON.slaveCoils.length; i++) {
      console.log(resultJSON.slaveCoils[i]);

      if (resultJSON.slaveCoils[i]) { // modify from true/false to modbus specific on/off
        resultJSON.slaveCoils[i] = "on";
      }
      else resultJSON.slaveCoils[i] = "off";

      afisare_raspuns_primit("coil", parseInt(startAddressReadCoils) + i, resultJSON.slaveCoils[i]);
    }

  } else {
    alert("HTTP-Error: " + response.status);
  }

}

async function fetchDiscreteValue() {   // trimitere cerere catre backend pentru citirea de dicrete inputs

  let startAddressReadCoils = document.getElementById("startAddressReadCoils").value;
  let coilCountRead = document.getElementById("coilCountRead").value;

  document.getElementById("consola").value += timestamp() + " INIT: Read " + coilCountRead + " discrete inputs starting from: " + startAddressReadCoils + "\n";

  //readDiscrete?startAddressReadCoils=0&coilCountRead=1;
  let url = "/readDiscrete?startAddressReadCoils=" + startAddressReadCoils + "&coilCountRead=" + coilCountRead;
  let response = await fetch(url);

  if (response.ok) { // if HTTP-status is 200-299

    let resultJSON = await response.json();

    afisare_transaction_code(resultJSON.transaction_code);

    for (let i = 0; i < resultJSON.slaveDiscrete.length; i++) {
      console.log(resultJSON.slaveDiscrete[i]);

      if (resultJSON.slaveDiscrete[i]) { // modify from true/false to modbus specific on/off
        resultJSON.slaveDiscrete[i] = "on";
      }
      else resultJSON.slaveDiscrete[i] = "off";

      afisare_raspuns_primit("discrete input", parseInt(startAddressReadCoils) + i, resultJSON.slaveDiscrete[i]);

    }

  } else {
    alert("HTTP-Error: " + response.status);
  }

}

async function fetchHoldingValue() {    // trimitere cerere catre backend pentru citirea de holding registers

  let startAddressReadRegisters = document.getElementById("startAddressReadRegisters").value;
  let regCount = document.getElementById("regCount").value;

  document.getElementById("consola").value += timestamp() + " INIT: Read " + regCount + " holding registers starting from: " + startAddressReadRegisters + "\n";

  //readHolding?startAddressReadRegisters=0&regCount=2
  let url = "/readHolding?startAddressReadRegisters=" + startAddressReadRegisters + "&regCount=" + regCount;
  let response = await fetch(url);

  if (response.ok) { // if HTTP-status is 200-299

    let resultJSON = await response.json();
    console.log(resultJSON);
    console.log(typeof resultJSON.transaction_code);

    afisare_transaction_code(resultJSON.transaction_code);

    for (let i = 0; i < resultJSON.slaveHolding.length; i++) {
      console.log(resultJSON.slaveHolding[i]);
      afisare_raspuns_primit("registru", parseInt(startAddressReadRegisters) + i, resultJSON.slaveHolding[i]);
    }

  } else {
    alert("HTTP-Error: " + response.status);
  }

}

async function fetchInputValue() {    // trimitere cerere catre backend pentru citirea de input registers

  let startAddressReadRegisters = document.getElementById("startAddressReadRegisters").value;
  let regCount = document.getElementById("regCount").value;

  document.getElementById("consola").value += timestamp() + " INIT: Read " + regCount + " input registers starting from: " + startAddressReadRegisters + "\n";

  //readInput?startAddressReadRegisters=0&regCount=2
  let url = "/readInput?startAddressReadRegisters=" + startAddressReadRegisters + "&regCount=" + regCount;
  let response = await fetch(url);

  if (response.ok) { // if HTTP-status is 200-299

    let resultJSON = await response.json();
    console.log(resultJSON);
    console.log(typeof resultJSON.transaction_code);

    afisare_transaction_code(resultJSON.transaction_code);

    for (let i = 0; i < resultJSON.slaveInput.length; i++) {
      console.log(resultJSON.slaveInput[i]);
      afisare_raspuns_primit("registru", parseInt(startAddressReadRegisters) + i, resultJSON.slaveInput[i]);
    }

  } else {
    alert("HTTP-Error: " + response.status);
  }

}

async function writeCoilsValue() {   // trimitere cerere catre backend pentru scriere de coils
  // send request to backend for write coils

  let startAddressWriteCoils = document.getElementById("startAddressWriteCoils").value;
  let coilCountWrite = document.getElementById("coilCountWrite").value;
  let valueToWriteCoil = document.getElementById("checkbox0").checked ? 1 : 0; // transform from true/false to 1/0 because 
  // the URL is string and is converted to bool in C side
  document.getElementById("consola").value += timestamp() + " INIT: Write " + coilCountWrite + " coil at address: " + startAddressWriteCoils + " with value: " + valueToWriteCoil + "\n";

  //writeCoils?startAddresWriteCoils=0&coilCountWrite=1&valueToWriteCoil=1
  let url = "/writeCoils?startAddresWriteCoils=" + startAddressWriteCoils + "&coilCountWrite=" + coilCountWrite + "&valueToWriteCoil=" + valueToWriteCoil;
  let response = await fetch(url);

  if (response.ok) { // if HTTP-status is 200-299

    let resultJSON = await response.json();

    afisare_transaction_code(resultJSON.transaction_code);
    console.log(resultJSON);

    for (let i = 0; i < resultJSON.slaveCoils.length; i++) {
      console.log(resultJSON.slaveCoils[i]);

      if (resultJSON.slaveCoils[i] == 1) { // modify from true/false to modbus specific on/off
        resultJSON.slaveCoils[i] = "on";
      }
      else resultJSON.slaveCoils[i] = "off";

      afisare_raspuns_primit("coil", parseInt(startAddressWriteCoils) + i, resultJSON.slaveCoils[i]);
    }

  } else {
    alert("HTTP-Error: " + response.status);
  }

}

async function writeHoldingRegister() {   // trimitere cerere catre backend pentru scriere de Holding Register
  // send request to backend for write holing register

  let startAddressWriteRegisters = document.getElementById("startAddressWriteRegisters").value;
  let registerCountWrite = document.getElementById("registerCountWrite").value;
  let valueToWriteRegister = document.getElementById("numberRegisterValue").value;
  // the URL is string and is converted to bool in C side
  document.getElementById("consola").value += timestamp() + " INIT: Write " + registerCountWrite + " register at address: " + startAddressWriteRegisters + " with value: " + valueToWriteRegister + "\n";

  //writeHreg?startAddressWriteRegisters=0&registerCountWrite=1&valueToWriteRegister=0
  let url = "/writeHreg?startAddressWriteRegisters=" + startAddressWriteRegisters + "&registerCountWrite=" + registerCountWrite + "&valueToWriteRegister=" + valueToWriteRegister;
  let response = await fetch(url);

  if (response.ok) { // if HTTP-status is 200-299

    let resultJSON = await response.json();

    afisare_transaction_code(resultJSON.transaction_code);
    console.log(resultJSON);

    for (let i = 0; i < resultJSON.slaveHolding.length; i++) {
      console.log(resultJSON.slaveHolding[i]);
      afisare_raspuns_primit("registru", parseInt(startAddressWriteRegisters) + i, resultJSON.slaveHolding[i]);
    }

  } else {
    alert("HTTP-Error: " + response.status);
  }

}





