function timestamp() {
  // get timestamp value
  let currentDate = new Date();
  let time = currentDate.getHours() + ":" + currentDate.getMinutes() + ":" + currentDate.getSeconds();
  return time;
}

function update_consola(id_parametru, parametru) {
  // print in consola actiunile utilizatorului
  document.getElementById("consola").value += timestamp() + " ---> " + id_parametru + " = " + parametru + "\n";
  document.getElementById("consola").scrollTop = document.getElementById("consola").scrollHeight; //autoscroll
}

function decToHex(num) {
  // convert form decimal to hexadecimal
  return num.toString(16)
}

function afisare_raspuns_modbus(parametru) {
  // print cod succes sau eroare

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

  document.getElementById("consola").value += timestamp() + " ---> " + text_raspuns_cerere + "\n";
  document.getElementById("consola").scrollTop = document.getElementById("consola").scrollHeight; //autoscroll

}

function afisare_valoare_modbus(parametru1, parametru2) {
  // print in console modbus response value

  document.getElementById("consola").value += timestamp() + " ---> " + "Valoare registru " + parametru1 + " : " + parametru2 + "\n";
  document.getElementById("consola").scrollTop = document.getElementById("consola").scrollHeight; //autoscroll
}

async function fetchRegistriJSON() {

  let firstReg = document.getElementById("firstReg").value;
  let regCount = document.getElementById("regCount").value;

  document.getElementById("consola").value += timestamp() + " INIT: Read " + regCount + " registers starting from: " + firstReg + "\n";

  //let url = "/readHolding?functionCode=3&firstReg=0&regCount=2";
  let url = "/readHolding?functionCode=3&firstReg=" + document.getElementById("firstReg").value + "&regCount=" + document.getElementById("regCount").value;
  let response = await fetch(url);

  if (response.ok) { // if HTTP-status is 200-299

    let resultJSON = await response.json();
    console.log(resultJSON);
    console.log(typeof resultJSON.transaction_code);

    afisare_raspuns_modbus(resultJSON.transaction_code);

    for (let i = 0; i < resultJSON.slaveRegisters.length; i++) {
      console.log(resultJSON.slaveRegisters[i]);
      afisare_valoare_modbus(parseInt(document.getElementById("firstReg").value) + i, resultJSON.slaveRegisters[i]);
    }

  } else {
    alert("HTTP-Error: " + response.status);
  }

}

// todo: vezi daca mai e necesara, sau cauta o metoda noua
function update_startAdressBit() {
  // functie utilizata pentru a actualiza valoarea de start pentru multiple reads/writes
  // functia preia valoarea de start adress de la celalalt form
  document.getElementById("startAdressBitCount").value = document.getElementById("startAdressBit").value
}
function update_startAdressCoil() {
  document.getElementById("startAdressCoilCount").value = document.getElementById("startAdressCoil").value
}


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


function verificare_mesaj() {
  // verificare continut mesaj

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

