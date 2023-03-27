// niveaux de log
const ERROR = 1, WARN = 2, INFO = 3, DEBUG = 4;
// VARIABLE DU NIVEAU DE LOG A DÉFINIR
var log_level = DEBUG;

// reécriture des fonctions de log
var original_log = console.log;
console.debug = function() {
    if (log_level >= DEBUG)
        original_log.apply(this, arguments);
}

var original_info = console.info;
console.info = function() {
    if (log_level >= INFO)
        original_info.apply(this, arguments);
}

var original_warn = console.warn;
console.warn = function() {
    if (log_level >= WARN)
        original_warn.apply(this, arguments);
}

var original_error = console.error;
console.error = function() {
    if (log_level >= ERROR)
        original_error.apply(this, arguments);
}

/* ------------------------------------------------------------------------- */
/* paramétrage de jQCloud (couleurs et tailles des mots de différents poids) */
/* choix effectué d'un paramétrage par JS, plutôt que par CSS pour faciliter */
/* le maintien de ce paramétrage lors des mises à jour de jQCloud, cf. :     */
/* - paramétrage JS : http://mistic100.github.io/jQCloud/demo.html           */
/* - paramétrage CSS : http://mistic100.github.io/jQCloud/#colors-and-sizes  */
/* ------------------------------------------------------------------------- */

// couleurs utilisée des mots avec le plus de poids vers les mots avec le moins de poids
// cf. http://paletton.com/#uid=13m0u0kR6rVvBKSOyBUSVmuUXgy pour l'origine des couleurs
var nuage_couleurs_mots = [
    "#d03f40", // Rouge
    "#791797", // Violet
    "#2e86de", // Bleu,
    "#ff9f43", // Orange,
    "#10ac84", // Vert,
    "#3f4b5a", // Gris anthracite
    "#5d8c9f"  // Gris clair
];
var nuage_taille_min_mots = 0.03;
var nuage_taille_max_mots = 0.1;

var params_nuage_mots = {
    classPattern: null,
    colors: nuage_couleurs_mots,
    fontSize: {from: nuage_taille_max_mots, to: nuage_taille_min_mots}
};

/* ------------------------------------------------------------------------- */

// main.js
console.debug("main.js");

// localStorage polyfill fallback to cookie if localStorage doesn't work
// cf https://stackoverflow.com/questions/4692245/html5-local-storage-fallback-solutions
window.localstore = {
    sessionStorageSupport: function() {
        try {
            var test = "test";
            sessionStorage.setItem(test, test);
            sessionStorage.removeItem(test);
            return true;
        } catch (e) {
            return false;
        }
    },
    set: function(name,value,days) {
        if (days) {
            var date = new Date();
            date.setTime(date.getTime()+(days*24*60*60*1000));
            var expires = "; expires="+date.toGMTString();
        }
        else {
            var expires = "";
        }
        if (this.sessionStorageSupport()) {
            sessionStorage.setItem(name, value);
        }
        else {
            document.cookie = name+"="+value+expires+"; path=/";
        }
    },
    get: function(name) {
        if (this.sessionStorageSupport()) {
            var ret = sessionStorage.getItem(name);
            //console.log(typeof ret);
            switch (ret) {
              case 'true':
                  return true;
              case 'false':
                  return false;
              default:
                  return ret;
            }
        }
        else {
            var nameEQ = name + "=";
            var ca = document.cookie.split(';');
            for(var i=0;i < ca.length;i++) {
                var c = ca[i];
                while (c.charAt(0)==' ') c = c.substring(1,c.length);
                if (c.indexOf(nameEQ) == 0) {
                    ret = c.substring(nameEQ.length,c.length);
                    switch (ret) {
                      case 'true':
                          return true;
                      case 'false':
                          return false;
                      default:
                          return ret;
                    }
                }
            }
            return null;
        }
    },
    del: function(name) {
        if (this.sessionStorageSupport()) {
            sessionStorage.removeItem(name);
        }
        else {
            this.set(name,"",-1);
        }
    }
};
console.debug("sessionStorageSupport =", localstore.sessionStorageSupport());

// définition des couleurs, en commun avec commun.css
var BLEU = '#7ECAD7';
var ORANGE = '#E9B912';     // étudiants perdus, réponses, etc.
var VERT = '#89C64A';       // bonnes réponses
var ROUGE = '#B70014';
var ANTHRACITE = '#303030'; // bordure autour des réponses de l'étudiant

// définition des couleurs des barres de l'histogramme, l'ordre compte :
// 1ère = réponses fausses, 2ème = réponses justes, 3ème = réponses neutres (bonnes réponses non indiquées)
var couleurs_barres = [ROUGE, VERT, ORANGE];
// couleur de la bordure des barres signalant mes réponses (de l'étudiant)
var couleur_mes_reponses = ANTHRACITE;

// id de la méthode de compte à rebours
// elle est globalisée pour pouvoir l'arrêter en dehors de la fonction
// notamment quand le délai change
var countdown;

// id de la méthode de chrono
var chrono;

// client websocket
function init_websocket(identite) {
    console.log("initialisation websocket");


    var supportWebSocket = null;
    var message_noWebSocket = "Votre navigateur ne supporte pas les websockets. Veuillez installer un navigateur qui les supporte comme une version récente de Firefox ou Chrome et recommencer.";

    // j'ai rencontré un appareil dont la connexion n'est jamais ouverte sans lever d'exception non plus
    setTimeout(function() {
        if (supportWebSocket == null) {
            supportWebSocket = false;
            enregistre_utilisateur(identite, supportWebSocket);
            alert(message_noWebSocket);
        }
    }, 3000);

    try {
        ws = new ReconnectingWebSocket("wss://iquiz.univ-toulouse.fr"+"/ws");
    } catch(e) {
        supportWebSocket = false;
        console.debug("support websocket is " + supportWebSocket);
        enregistre_utilisateur(identite, supportWebSocket);
        alert(message_noWebSocket);
    }

    ws.onopen = function() {
        console.debug("socket ouvert");

        supportWebSocket = true;
        console.debug("support websocket is " + supportWebSocket);
        // évite de réenregistrer l'utilisateur après l'avoir fait à la question n°0
        if (identite.question.numero == 0)
            enregistre_utilisateur(identite, supportWebSocket);

        // s'identifie auprès sur serveur WS
        identite["event"] = "connexion";
        var identite_json = JSON.stringify(identite);
        ws.send(identite_json);
        console.debug("message d'identification envoyé");

        // réinitialise l'attribut perdu en cas de rechargement de la page
        if (identite.perdu && identite.perdu == true) {
            console.info("I once was lost, but now am found");
            update("iquiz", identite, "perdu", false);
            envoi_message("retrouve", identite.question, identite.data);
        }
    };

    ws.onmessage = function(e) {
        console.debug("message = " + e.data);

        // à réception d'un message exécute la fonction correspondante
        // dont le nom est celui de l'event, avec ses paramètres
        var objet = JSON.parse(e.data);
        var f = window[objet.event];
        if (typeof f == 'function') {
            f(objet.question, objet.data);
        } else {
            console.debug("f n'existe pas: event = " + objet.event + ", typeof f = " + typeof f);
        }
    };

    ws.onerror = function(e) {
        console.debug("erreur de connexion");
        if (typeof ws.onerror.counter == 'undefined') {
            ws.onerror.counter = 0;
        } else {
            ws.onerror.counter++;
            console.debug("compteur d'erreur: " + ws.onerror.counter);
            if (ws.onerror.counter > 5) {
                alert("votre navigateur ne semble pas parvenir à se connecter au serveur de websocket, contactez votre enseignant.");
            }
        }
    };

    ws.onclose = function(e) {
        console.debug("code = " + e.code)
        if (e.wasClean) {
            console.debug("socket fermé proprement");
        } else {
            console.debug("socket mal fermé");
            if (e.reason) console.debug("reason = " + e.reason);
        }
    };
    return ws;
}


// récupère le cookie CSRF pour avoir le droit de POSTer
// utilisé parc check_identite() pour enregistrer l'utilisateur auprès du serveur en Ajax
function getCookie(name) {
    var cookieValue = null;
    var i = 0;
    if (document.cookie && document.cookie !== '') {
        var cookies = document.cookie.split(';');
        for (i; i < cookies.length; i++) {
            var cookie = jQuery.trim(cookies[i]);
            // Does this cookie string begin with the name we want?
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}
var csrftoken = getCookie('csrftoken');

function csrfSafeMethod(method) {
    // these HTTP methods do not require CSRF protection
    return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
}
$.ajaxSetup({
    crossDomain: false, // obviates need for sameOrigin test
    beforeSend: function(xhr, settings) {
        if (!csrfSafeMethod(settings.type)) {
            xhr.setRequestHeader("X-CSRFToken", csrftoken);
        }
    }
});


// vérifie si l'identité existe déjà sinon on stocke la nouvelle dans le navigateur
function check_identite() {
    console.debug("check_identite");

    var session = parseInt($("#identifiant").text());
    var UUID = $("#UUID").text();
    var role = $("#role").text();
    console.debug("session = " + session + ", UUID = " + UUID + ", role = " + role);

    identite = recall("iquiz");
    if (identite && identite.question.session == session) {
        // si c'est la même session, alors garder l'identité existante plutôt qu'utiliser la nouvelle
        console.debug("même session");
        UUID = identite.data.UUID;
        role = identite.data.role;
    } else {
        console.debug("nouvelle session");
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
    .always(function() { console.debug("enregitrement de l'utilisateur en ajax") })
    .done(function(data) { if (data.statut)
            console.debug("résultat :", data['message']);
        else
            console.debug("ERROR : ", data.message);
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
        console.debug("utilisateur non enregistré");
        console.debug("statut :",textStatus, "erreur :", errorThrown);
    });
}


// fonction de récupération de données stockées dans le navigateur
var recall = function(cle) {
    if (localstore.get(cle) !== null) {
        var json = localstore.get(cle);
        var object = JSON.parse(json);
        console.debug("recalled = " + json);
        return object;
    } else {
        return null;
    }
}

// fonction de stockage de données dans le navigateur
var store = function(cle, object) {
    var json = JSON.stringify(object);
    console.debug("stored = " + json);
    localstore.set(cle, json);
}

// fonction de mise à jour d'un attribut
var update = function(cle, object, attribute, value) {
    if (localstore.get(cle) !== null && object) {
        object[attribute] = value;
        store(cle, object);
    } else {
        console.debug("cle " + cle + " ou object inexistant");
        return null;
    }
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


// compte à rebours
$.fn.countdown = function (url, duration) {
    var container = $(this[0]).html(duration);
    countdown = setInterval(function () {
        if (--duration >= 0) {
            container.html(duration);
        } else {
            clearInterval(countdown);
            $.mobile.changePage(url, {transition: "slide", changeHash: false});
        }
    }, 1000);
};


// chronometre qui indique le temps qui s'écoule lorsque l'on choisit délai infini
$.fn.chrono = function () {
    var container = $(this[0]).html(delai);
    chrono = setInterval(function() {
        container.html(delai);
        delai++;
        console.debug("chrono delai = ", delai);
    }, 1000);
};


// affichage d'un graphe de réponses
function graphe(container, debattue, nature, bonnes_reponses, qte_reponses1, qte_reponses2, mes_reponses1, mes_reponses2) {

    var mes_reponses1 = mes_reponses1 || [];
    var mes_reponses2 = mes_reponses2 || [];
    var bonnes_reponses = bonnes_reponses || [];
    console.debug("graphe: container =", container, "debattue =", debattue, "nature =", nature, "bonnes_reponses =", bonnes_reponses, "qte_reponses1 =", qte_reponses1, "qte_reponses2 =", qte_reponses2, "mes_reponses1 =", mes_reponses1, "mes_reponses2 =", mes_reponses2);

    switch (nature) {
        // QCM
        case "Q":
            // initialisation des données
            var categories = new Array(qte_reponses1.length-1);
            var donnees1 = new Array(qte_reponses1.length-1);
            if (debattue)
                var donnees2 = new Array(qte_reponses2.length-1);

            // formatage des réponses
            for(i=1; i<=qte_reponses1.length-1; i++) {
                categories[i-1] = i;

                // recherche et coloration des réponses
                if (bonnes_reponses.length > 0)
                    var bonnes = bonnes_reponses.indexOf(i) == -1 ? 0 : 1;
                else
                    // si les réponses justes ne sont pas renseignées, on prend les couleurs sur la troisième ligne
                    var bonnes = 2

                // formatage de la barre de la réponse 1
                donnees1[i-1] = {y: qte_reponses1[i], color: couleurs_barres[bonnes] };
                var miennes1 = mes_reponses1.indexOf(i) == -1 ? 0 : 1;
                if (miennes1) {
                    // ajoute une bordure autour de la barre si c'est ma réponse
                    donnees1[i-1].borderColor = couleur_mes_reponses;
                    donnees1[i-1].borderWidth = 2;
                }
                console.debug("i =", categories[i-1], "donnees1 =", donnees1[i-1]);

                // formatage de la barre de la réponse 2
                if (debattue) {
                    donnees2[i-1] = {y: qte_reponses2[i], color: couleurs_barres[bonnes]};
                    var miennes2 = mes_reponses2.indexOf(i) == -1 ? 0 : 1;
                    if (miennes2) {
                        // ajoute une bordure autour de la barre si c'est ma réponse
                        donnees2[i-1].borderColor = couleur_mes_reponses;
                        donnees2[i-1].borderWidth = 2;
                    }
                    console.debug("i =", categories[i-1], "donnees2 =", donnees2[i-1]);
                }
            }

            // traçage du graphe
            var chart = {
                chart: { type: 'column' },
                title: { text: '' },
                xAxis: {
                    categories: categories,
                    title: { text: "" },
                    labels: {
                        overflow: 'justify',
                        // cf. https://api.highcharts.com/highcharts/xAxis.labels.formatter,
                        //     https://stackoverflow.com/questions/11182681/highchart-change-color-of-one-x-axis-label-only/34424825
                        formatter: function () {
                            valeur_formatee = this.value;
                            if (bonnes_reponses.length > 0) {
                                if (bonnes_reponses.includes(this.value)) {
                                    couleur_no_reponse = VERT;
                                    gras_ou_pas = 'font-weight: bold';
                                }
                                else {
                                    couleur_no_reponse = ROUGE;
                                    gras_ou_pas = '';
                                }
                                valeur_formatee = '<span style="fill: ' + couleur_no_reponse + '; '
                                                                        + gras_ou_pas + '">' +
                                                       valeur_formatee +
                                                   '</span>';
                            }
                            return valeur_formatee;
                        }
                    }
                },
                yAxis: {
                    min: 0,
                    allowDecimals: false,
                    title: { text: '' },
                    labels: { overflow: 'justify' }
                },
                series: [{ data: donnees1 }],
                plotOptions: { column: { dataLabels: { enabled: true } } },
                legend: { enabled: false },
                credits: { enabled: false },
                tooltip: { enabled: false },
            };
            if (debattue)
                chart.series.push({ data: donnees2 })
            Highcharts.chart(container, chart);
            break;

        // nuage de mots
        case "O":
            // premières réponses
            console.debug("debattue =", debattue, ": affichage premier nuage")
            var words = $.map(qte_reponses1, function(value, index) {
                return [{text: index, weight: value }]
            });
            $("#"+container).jQCloud([], params_nuage_mots);
            $("#"+container).jQCloud('update', words);

            // secondes réponses
            if (debattue) {
                console.debug("debattue =", debattue, ": affichage second nuage")
                var words = $.map(qte_reponses2, function(value, index) {
                    return [{text: index, weight: value }]
                });
                container2 = $("#"+container+"2")
                container2.removeClass('hidden');
                container2.jQCloud([], params_nuage_mots);
                container2.jQCloud('update', words);
                // curieusement la largeur du div passe à 90px toute seule, il faut la corriger
                container2.css('width', '90%');
                container2.jQCloud('resize');
            } else {
                // utile surtout pour la page de l'étudiant qui n'est pas rechargée
                console.debug("debattue =", debattue, ": masquage du second nuage")
                container2 = $("#"+container+"2")
                container2.empty();
                container2.addClass('hidden');
            }
            break;

        default:
            console.debug("nature inconnue: ", nature);
    }
}


// fonctions de traitement des messages ws entrants (appelées depuis onmessage)


// event reponse
// traite la réponse reçue d'un étudiant par l'enseignant et met à jour le graphe
// remarque: les variables reponses et response_chart sont déclarées globales dans enseignant.js
function reponse(question, data) {
    console.debug("event reponse: data.reponses =", data.reponses, "nature =", data.nature);

    switch (data.nature) {
        case "Q":
            data.reponses.forEach(function(value) {
                // ajoute les réponses au tableau des quantités
                if (reponses[value] == undefined) {
                    reponses[value]=1;
                } else {
                    reponses[value]++;
                }
                // met à jour le graphe
                // remarque: l'indice des réponses commence à 1 mais celui des data à 0
                response_chart.series[0].data[value-1].update(reponses[value]);
            });
            console.debug("tableau des reponses =", reponses);
            break;

        case "O":
            data.reponses.forEach(function(value) {

                // ajoute les réponses au tableau des quantités
                if (reponses_qouverte[value] == undefined) {
                    reponses_qouverte[value]=1;
                } else {
                    reponses_qouverte[value]++;
                }

                // convertit l'objet JS en tableau d'objets pour jQCloud
                var words = $.map(reponses_qouverte, function(value, index) {
                    return [{text: index, weight: value }]
                });

                $('#reponses').jQCloud('update', words);
            });
            console.debug("tableau des reponses =", reponses_qouverte);
            break;

        default:
            console.debug("nature inconnue : " + data.nature);
            break;
    }

    // met à jour le nombre de réponses
    var selecteur = $("#entete_resultats").find("span[name='qte_reponses']");
    var qte_reponses = parseInt(selecteur.text()) + 1;
    selecteur.text(qte_reponses);
    jauge_reponses.series[0].data[0].update(qte_reponses);
    console.debug("qté réponses =", qte_reponses);
}


// met à jour le nombre de réponses reçues
function notif_reponse(question, data) {
    console.debug("event notif_reponse: question =", question);
    var iquiz = recall("iquiz");
    console.debug("iquiz.question =", iquiz.question);
    if (question.session == iquiz.question.session && question.numero == iquiz.question.numero && question.ordre == iquiz.question.ordre) {
        var selecteur = $("#nature" + data.nature).find("span[name='qte_reponses']");
        var qte_reponses = parseInt(selecteur.text()) + 1;
        selecteur.text(qte_reponses);
    }
    console.debug("qté réponses =", qte_reponses);
}


// mise à jour des éléments qui dépendent du nombre d'étudiants connectés
function mise_a_jour_etudiants(qte_etudiants) {
    console.debug("qté étudiants =", qte_etudiants);

    // met à jour l'affichage du nombre d'étudiants
    $("#qte_etudiants").text(qte_etudiants);
}


// event connexion
// enregistre la connexion d'un étudiant par l'enseignant
function connexion(question, data) {
    console.debug("connexion d'un étudiant :", data.UUID);

    // met à jour le nombre d'étudiants
    iquiz = recall("iquiz");
    iquiz.qte_etudiants = ++iquiz.qte_etudiants || 1;
    store("iquiz", iquiz);
    mise_a_jour_etudiants(iquiz.qte_etudiants);

    // met à jour la jauge des réponses (seulement en cas de connexion et pas de déconnexion)
    jauge_reponses.series[0].yAxis.update({max: iquiz.qte_etudiants});
}


// event déconnexion
// enregistre la déconnexion d'un étudiant par l'enseignant
function deconnexion(question, data) {
    console.debug("déconnexion d'un étudiant :", data.UUID);

    // met à jour le nombre d'étudiants
    iquiz = recall("iquiz");
    iquiz.qte_etudiants = --iquiz.qte_etudiants || 0;
    store("iquiz", iquiz);
    mise_a_jour_etudiants(iquiz.qte_etudiants);
}


// event perdu
// enregistrement par l'enseignant qu'un étudiant est perdu
function perdu(question, data) {
    console.debug("un étudiant est perdu :", data.UUID);

    // met à jour de l'histogramme des étudiants perdus
    refresh_perdus(iquiz.question.session);
}


// event retrouve
// enregistrement par l'enseignant qu'un étudiant n'est plus perdu
function retrouve(question, data) {
    console.debug("un étudiant n'est plus perdu :", data.UUID);
}


// event resultat
// affichage des resultats de la question par l'étudiant
function resultat(question, data) {
    console.debug("resultat: nature =", data.nature, "ordre =", question.ordre, "debattue =", data.debattue, "mode_debat =", data.mode_debat, 
    "réponses 1 =", data.reponses1, "réponses 2 =", data.reponses2, 
    "bonnes reponses existent =", data.bonnes_reponses_existent, "bonnes réponses =", data.bonnes_reponses, 
    "mes réponses 1 =", data.mes_reponses1, "mes réponses 2 =", data.mes_reponses2);

    clearInterval(chrono);

    // désactive les boutons de l'enseignant
    if (data.role == "P") {
        $("button[name='clore']").addClass('ui-state-disabled');

        /* Dégrisage des boutons, 4 cas dans l'ordre :
         * - mode débat non terminé : bouton relance
         *  - et bonnes réponses fournies : et bouton bonnes réponses
         *  - et bonnes réponses non fournies : et bouton question suivante
         * - mode débat désactivé ou terminé : bouton question suivante
         */
        if (data.mode_debat && question.ordre < 2) {
            $("button[name='relancer']").removeClass('ui-state-disabled');
            if (data.bonnes_reponses_existent)
                $("button[name='bonnes_reponses']").removeClass('ui-state-disabled');
            else
                $("#question-suivante").removeClass('ui-state-disabled');
        } else {
            $("button[name='relancer']").addClass('ui-state-disabled');
            $("button[name='bonnes_reponses']").addClass('ui-state-disabled');
            $("#question-suivante").removeClass('ui-state-disabled');
        }
    }

    // change la page de l'étudiant
    if (data.role == "A")
        $.mobile.changePage("#resultat", {transition: "slide", changeHash: false});

    $("#reponses").empty();
    graphe("reponses", data.debattue, data.nature, data.bonnes_reponses, data.reponses1, data.reponses2, data.mes_reponses1, data.mes_reponses2);
}
