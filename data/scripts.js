// functions for page dinamics

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
  document.getElementById("button_readHolding").addEventListener("click", function (event) {
    event.preventDefault()
  });

  document.getElementById("button_readCoils").addEventListener("click", function (event) {
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
// todo change name
function afisare_raspuns_modbus(parametru) {    // print cod succes sau eroare
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
// todo change name
function afisare_valoare_modbus(item_type, item_number, item_value) {   // print in console the modbus response value 
  // item_type  = coil sau registru (register)
  // item_number = register number 
  // item_value = actual register value

  document.getElementById("consola").value += timestamp() + " ---> " + "Valoare " + item_type + " " + item_number + " : " + item_value + "\n";
  document.getElementById("consola").scrollTop = document.getElementById("consola").scrollHeight; //autoscroll
}

async function fetchCoilsJSON() {   // trimitere cerere catre backend pentru citirea de coils

  let startAddressCoils = document.getElementById("startAddressCoils").value;
  let coilCount = document.getElementById("coilCount").value;

  document.getElementById("consola").value += timestamp() + " INIT: Read " + coilCount + " coils starting from: " + startAddressCoils + "\n";

  //readCoils?startAddressCoils=0&coilCount=1;
  let url = "/readCoils?startAddressCoils=" + startAddressCoils + "&coilCount=" + coilCount;
  let response = await fetch(url);

  if (response.ok) { // if HTTP-status is 200-299

    let resultJSON = await response.json();

    afisare_raspuns_modbus(resultJSON.transaction_code);

    for (let i = 0; i < resultJSON.slaveCoils.length; i++) {
      console.log(resultJSON.slaveCoils[i]);

      if (resultJSON.slaveCoils[i]) { // modify from true/false to modbus specific on/off
        resultJSON.slaveCoils[i] = "on";
      }
      else resultJSON.slaveCoils[i] = "off";

      afisare_valoare_modbus("coil", parseInt(startAddressCoils) + i, resultJSON.slaveCoils[i]);
    }

  } else {
    alert("HTTP-Error: " + response.status);
  }

}

async function fetchRegistriJSON() {    // trimitere cerere catre backend pentru citirea de holding registers

  let startAddressReg = document.getElementById("startAddressReg").value;
  let regCount = document.getElementById("regCount").value;

  document.getElementById("consola").value += timestamp() + " INIT: Read " + regCount + " holding registers starting from: " + startAddressReg + "\n";

  //let url = "/readHolding?startAddressReg=0&regCount=2";
  let url = "/readHolding?startAddressReg=" + startAddressReg + "&regCount=" + regCount;
  let response = await fetch(url);

  if (response.ok) { // if HTTP-status is 200-299

    let resultJSON = await response.json();
    console.log(resultJSON);
    console.log(typeof resultJSON.transaction_code);

    afisare_raspuns_modbus(resultJSON.transaction_code);

    for (let i = 0; i < resultJSON.slaveRegisters.length; i++) {
      console.log(resultJSON.slaveRegisters[i]);
      afisare_valoare_modbus("registru", parseInt(startAddressReg) + i, resultJSON.slaveRegisters[i]);
    }

  } else {
    alert("HTTP-Error: " + response.status);
  }

}