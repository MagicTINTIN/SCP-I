console.log("Starting SCP I");
//import WebSocket from 'ws';
const { WebSocket } = require("ws")

//////////////////////////// DÉBUT DE LA PARTIE À COMPLÉTER \\\\\\\\\\\\\\\\\\\\\\\\\\\\

const websitebase = "http://iquiz.univ-toulouse.fr/";
const websocketlink = "wss://iquiz.univ-toulouse.fr" + "/ws";

// numéro de session
const sessionNB = 98915;

// nombre de comptes utilisés au maximum
const maxusers = 20;

// fonction periodique dans le temps
const periodic = true;

// nombre d'étapes (ou taille de période) 1 = 1min sur le graphique
const stepnumber = 5;
// variation de x : [start, end]
const xbelongsto = [0, 3.14 * 2];

const UUIDuser = "fcbfe7f1-0b59-4167-863f-2205c8f34e99"

// fonction de x
function name(x) {
    return Math.cos(x);
}

//////////////////////////// FIN DE LA PARTIE À COMPLÉTER \\\\\\\\\\\\\\\\\\\\\\\\\\\\

const ws = new WebSocket(websocketlink, {
    perMessageDeflate: false
});

qnb = 0;

function envoi_message(event, question, data) {
    var object = {
        "event": event,
        "question": question,
        "data": data
    };
    var json = JSON.stringify(object);
    console.debug("message_envoye = " + json);
    ws.send(json);
}

envoi_message("perdu", { "session": sessionNB, "numero": qnb }, { "UUID": UUIDuser, "role": "A" })