
function init_websocket(identite) {
    console.log("initialisation websocket");


    var supportWebSocket = null;
    var message_noWebSocket = "Votre navigateur ne supporte pas les websockets. Veuillez installer un navigateur qui les supporte comme une version récente de Firefox ou Chrome et recommencer.";

    // j'ai rencontré un appareil dont la connexion n'est jamais ouverte sans lever d'exception non plus
    setTimeout(function () {
        if (supportWebSocket == null) {
            supportWebSocket = false;
            enregistre_utilisateur(identite, supportWebSocket);
            console.log("⚠️" + message_noWebSocket);
        }
    }, 3000);

    try {
        ws = new ReconnectingWebSocket("wss://iquiz.univ-toulouse.fr" + "/ws");
    } catch (e) {
        supportWebSocket = false;
        console.log("support websocket is " + supportWebSocket);
        enregistre_utilisateur(identite, supportWebSocket);
        console.log("⚠️" + message_noWebSocket);
    }

    ws.onopen = function () {
        console.log("socket ouvert");

        supportWebSocket = true;
        console.log("support websocket is " + supportWebSocket);
        // évite de réenregistrer l'utilisateur après l'avoir fait à la question n°0
        if (identite.question.numero == 0)
            enregistre_utilisateur(identite, supportWebSocket);

        // s'identifie auprès sur serveur WS
        identite["event"] = "connexion";
        var identite_json = JSON.stringify(identite);
        ws.send(identite_json);
        console.log("message d'identification envoyé");

        // réinitialise l'attribut perdu en cas de rechargement de la page
        if (identite.perdu && identite.perdu == true) {
            console.info("I once was lost, but now am found");
            update("iquiz", identite, "perdu", false);
            envoi_message("retrouve", identite.question, identite.data);
        }
    };

    ws.onmessage = function (e) {
        console.log("message = " + e.data);

        // à réception d'un message exécute la fonction correspondante
        // dont le nom est celui de l'event, avec ses paramètres
        var objet = JSON.parse(e.data);
        var f = window[objet.event];
        if (typeof f == 'function') {
            f(objet.question, objet.data);
        } else {
            console.log("f n'existe pas: event = " + objet.event + ", typeof f = " + typeof f);
        }
    };

    ws.onerror = function (e) {
        console.log("erreur de connexion");
        if (typeof ws.onerror.counter == 'undefined') {
            ws.onerror.counter = 0;
        } else {
            ws.onerror.counter++;
            console.log("compteur d'erreur: " + ws.onerror.counter);
            if (ws.onerror.counter > 5) {
                console.log("⚠️" + "votre navigateur ne semble pas parvenir à se connecter au serveur de websocket, contactez votre enseignant.");
            }
        }
    };

    ws.onclose = function (e) {
        console.log("code = " + e.code)
        if (e.wasClean) {
            console.log("socket fermé proprement");
        } else {
            console.log("socket mal fermé");
            if (e.reason) console.log("reason = " + e.reason);
        }
    };
    return ws;
}

// vérifie si l'identité existe déjà sinon on stocke la nouvelle dans le navigateur
function check_identite() {
    console.log("check_identite");

    var session = parseInt($("#identifiant").text());
    var UUID = $("#UUID").text();
    var role = $("#role").text();
    console.log("session = " + session + ", UUID = " + UUID + ", role = " + role);

    identite = recall("iquiz");
    if (identite && identite.question.session == session) {
        // si c'est la même session, alors garder l'identité existante plutôt qu'utiliser la nouvelle
        console.log("même session");
        UUID = identite.data.UUID;
        role = identite.data.role;
    } else {
        console.log("nouvelle session");
        var identite = {
            question: {
                session: session,
                numero: 0
            },
            data: {
                UUID: UUID,
                role: role
            }
        };
        store("iquiz", identite);
    }

    return identite;
}


// enregistre l'utilisateur auprès du serveur en Ajax
function enregistre_utilisateur(identite, supportWebSocket) {

    $.ajax({
        type: "POST",
        url: "/enregistre_utilisateur/",
        // évite une race condition avec le serveur de WS qui peut enregistrer l'utilisateur en double en même temps
        async: false,
        data: {
            'session': identite.question.session,
            'UUID': identite.data.UUID,
            'role': identite.data.role,
            'localStorage': localstore.sessionStorageSupport() ? 1 : 0,
            'websocket': supportWebSocket ? 1 : 0,
            'dataType': "json",
        },
    })
        .always(function () { console.log("enregitrement de l'utilisateur en ajax") })
        .done(function (data) {
            if (data.statut)
                console.log("résultat :", data['message']);
            else
                console.log("ERROR : ", data.message);
        })
        .fail(function (jqXHR, textStatus, errorThrown) {
            console.log("utilisateur non enregistré");
            console.log("statut :", textStatus, "erreur :", errorThrown);
        });
}


// fonction d'envoi de message par l'étudiant ou l'enseignant au serveur de WS
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