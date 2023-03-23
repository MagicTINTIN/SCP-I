// etudiant.js
console.log("etudiant.js");

var delai;

// fonctions de traitement des messages ws entrants (appelées depuis onmessage)

// event question
// remplit les pages etudiant-qcm ou etudiant-ouverte avec les données reçues du serveur
function question(question, data) {
    console.debug("traitement de l'événement question");
    envoi_message("AR", question, data);

    // mise à jour des données stockées dans le navigateur
    iquiz = recall("iquiz");
    if (!iquiz || iquiz.question.session != question.session) {
        console.debug("erreur de session: session = " + question.session);
        return;
    } else {
        iquiz.data.nbr_reponses = data.nbr_reponses;
        update("iquiz", iquiz, "data", iquiz.data);
        update("iquiz", iquiz, "question", question);
    }

    // change de page
    $.mobile.changePage("#nature" + data.nature, { transition: "slide", changeHash: false });

    // affiche les données de la question sur la page
    var page = $("#nature" + data.nature)
    page.find("span[name='identifiant']").text(question.session);
    page.find("span[name='numero']").text(question.numero);
    page.find("span[name='qte_reponses']").text(0);

    clearInterval(chrono);
    if (data.delai) {
        page.find("span[name='delai']").countdown("#resultat", data.delai);
        page.find("span[name='unite']").removeClass('hidden');
    } else {
        delai = 0;
        page.find("span[name='delai']").chrono();
    }

    // construction de la liste des réponses
    switch (data.nature) {
        case "Q":
            container_reponses = $('#qcm-fieldset').controlgroup("container")
            container_reponses.empty();
            for (i = 1; i < data.nbr_reponses + 1; i++) {
                $('<input/>', {
                    name: "reponses",
                    id: "reponse" + i,
                    value: i,
                    type: "checkbox"
                }).appendTo(container_reponses);

                $('<label/>', {
                    for: "reponse" + i,
                    html: i
                }).appendTo(container_reponses);
            }
            $("#qcm-fieldset").enhanceWithin().controlgroup("refresh");
            break;

        case "O":
            container_reponses = $('#qouverte-fieldset');
            container_reponses.empty();
            // si le nombre de réponses est infini alors on affiche un champ à la fois
            nbr_fields = data.nbr_reponses > 0 ? data.nbr_reponses : 1;
            for (i = 1; i <= nbr_fields; i++) {
                $('<div/>', {
                    class: 'ui-field-contain',
                    html: $('<label/>', {
                        for: "reponse" + i,
                        html: data.nbr_reponses > 0 ? "réponse " + i + " : " : "réponse : "
                    }).add($('<input/>', {
                        id: "reponse" + i,
                        type: "text"
                    }))
                }).appendTo(container_reponses);
            }
            break;
        default:
            console.debug("nature inconnue : " + data.nature);
            break;
    }
}


// event majdelai
// met à jour le délai de la question avec la valeur reçue de l'enseignant
function majdelai(question, data) {
    console.debug("traitement de l'événement delai avec la valeur " + data.delai);

    clearInterval(countdown);
    var page = $("#nature" + data.nature);
    page.find("span[name='delai']").countdown("#resultat", data.delai);
    page.find("span[name='unite']").removeClass('hidden');
    console.debug("nouveau delai = " + page.find("span[name='delai']").text());
}


// event cloture_session
// redirige l'étudiant vers la page principale pour le déconnecter du serveur WS
function cloture_session(question) {
    console.debug("cloture de la session n°", question.session);
    window.location = "/a";
}


// gestionnaires d'événements sur la page
$(function () {

    iquiz = check_identite();

    /* connexion au serveur WS */
    init_websocket(iquiz);

    /* appui sur le bouton je suis perdu */
    $("#je_suis_perdu").click(function () {
        console.log("je suis perdu");
        $("#perdu_off").addClass('hidden');
        $("#perdu_on").removeClass('hidden');
        $("#je_suis_perdu").addClass('ui-disabled');
        // envoie une notification à l'enseignant par la connexion WS
        iquiz = recall("iquiz");
        envoi_message("perdu", iquiz.question, iquiz.data);
        update("iquiz", iquiz, "perdu", true);

        // débloque le bouton
        setTimeout(function () {
            console.log("je ne suis plus perdu");
            $("#perdu_off").removeClass('hidden');
            $("#perdu_on").addClass('hidden');
            $("#je_suis_perdu").removeClass('ui-disabled');
            envoi_message("retrouve", iquiz.question, iquiz.data);
            update("iquiz", iquiz, "perdu", false);
        }, 1000 * 60 * 0.5)
    });

    /* soumission de réponses à un QCM */
    $("#qcm").submit(function (event) {
        event.preventDefault();
        var reponses = $("input[name='reponses']:checked").map(function () {
            return parseInt(this.value);
        }).get();
        clearInterval(chrono);
        console.log("réponses = " + reponses);
        iquiz = recall("iquiz");
        iquiz.data["reponses"] = reponses;
        iquiz.data.nature = "Q";
        envoi_message("reponse", iquiz.question, iquiz.data);
        repondu = true;
        $.mobile.changePage("#perdu", { transition: "slide", reverse: true, changeHash: false });
        return false;
    });

    /* soumission de réponses à une question ouverte */
    $("#qouverte").submit(function (event) {
        event.preventDefault();
        var reponses = $("input[type='text']").map(function () {
            // élimine les réponses vides, les majuscules et les espaces préfixants et trainants pour homogénéiser les réponses
            v = this.value.trim();
            if (v)
                return v.toLowerCase();
        }).get();

        console.log("réponses = " + reponses);
        iquiz = recall("iquiz");
        iquiz.data["reponses"] = reponses;
        iquiz.data.nature = "O";
        envoi_message("reponse", iquiz.question, iquiz.data);

        if (iquiz.data.nbr_reponses == 0) {
            console.debug("Nombre de réponses infinis : iquiz.data.nbr_reponses ", iquiz.data.nbr_reponses);
            // si le nombre de réponses est infini on réinitilise le formulaire avant de le réafficher
            container_reponses = $('#qouverte-fieldset');
            container_reponses.empty();
            $('<div/>', {
                class: 'ui-field-contain',
                html: $('<label/>', {
                    for: "reponse",
                    html: "réponse : "
                }).add($('<input/>', {
                    id: "reponse",
                    type: "text"
                }))
            }).appendTo(container_reponses);
            $("#reponse").focus();
            $.mobile.changePage("#qouverte", { transition: "slide", reverse: true, changeHash: false });
        } else {
            console.debug("Nombre de réponses finis : iquiz.data.nbr_reponses ", iquiz.data.nbr_reponses);
            repondu = true;
            clearInterval(chrono);
            $.mobile.changePage("#perdu", { transition: "slide", reverse: true, changeHash: false });
        }

        return false;
    });


    // variable indiquant si l'étudiant vient de répondre à une question
    var repondu = false;

    // lors de l'affichage de la page d'attente '#perdu', gestion de l'affichage du message
    // sur le bandeau supérieur selon que la page s'affiche suite à la réponse d'un étudiant,
    // ou après retour à cette page d'attente depuis la page de résultats
    $(document).on('pagebeforeshow', '#perdu', function (e, data) {
        var message_attente;
        if (repondu) {
            // Merci de patienter : réponses en cours
            $('#msg_attente_avec_question').removeClass('hidden');
            $('#msg_attente_sans_question').addClass('hidden');
            repondu = false;
        }
        else {
            // Pas de question en ce moment
            $('#msg_attente_avec_question').addClass('hidden');
            $('#msg_attente_sans_question').removeClass('hidden');
        }
    });
});
