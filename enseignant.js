// enseignant.js
console.log("enseignant.js");

// délai de réponse à la question; vaut -1 après expiration
var delai;

// booléen indiquant si le délai est illimité ou non
var illimite;

// variable du graphe des réponses mis à jour par les events "reponse"
var response_chart;
// variable de l'histogramme des étudiants
var perdus_chart;
// variable de la jauge des réponses mis à jour par les events "reponse"
var jauge_reponses;

// tableau des quantités de réponses à la question en cours pour chaque valeur possible
var reponses = [];
var reponses_qouverte = {};

// fonction d'envoi de la notification de résultat
function envoi_message_résultat() {
    ordre = parseInt($("#ordre").text());
    console.log("envoi message résultat, nature =", nature, ", ordre =", ordre);
    iquiz = recall("iquiz");
    iquiz.data.nature = nature
    iquiz.question.ordre = ordre
    envoi_message("resultat", iquiz.question, iquiz.data);
}

// fonction qui déclenche le compte à rebours
// et qui contient la fonction de callback
function lance_compte_a_rebours(nature) {
    illimite = false;
    $("#entete_resultats").find("span[name='delai']").compte_a_rebours(envoi_message_résultat);
    $("#entete_resultats").find("span[name='unite']").removeClass('hidden');
}


// compte à rebours dont la durée est une variable globale modifiable à l'extérieur de la fonction
// et qui appelle une fonction de callback à l'expiration
$.fn.compte_a_rebours = function (callback) {
    var container = $(this[0]).html(delai);
    var compte_a_rebours = setInterval(function () {
        if (--delai >= 0) {
            container.html(delai);
            console.debug("compte_a_rebours delai = ", delai);
        } else {
            clearInterval(compte_a_rebours);
            callback();
        }
    }, 1000);
};


// trace la jauge des réponses dans le div "jauge_reponses"
function init_jauge_reponses(qte_etudiants) {

    console.log("init_jauge_reponses()");

    jauge_reponses = Highcharts.chart("jauge_reponses", {
        chart: {
            type: 'bar',
            marginLeft: 10
        },
        series: [{
            data: [0],
            pointWidth: 27,
        }],
        xAxis: {
            labels: { enabled: false },
            tickLength: 0
        },
        yAxis: {
            min: 0,
            max: qte_etudiants,
            title: { text: false },
            tickWidth: 1,
            lineWidth: 1,
            endOnTick: false,
            allowDecimals: false
        },
        plotOptions: { bar: { dataLabels: { enabled: true } } },
        title: {
            text: "",
            align: "left",
            verticalAlign: 'middle',
            y: 0
        },
        colors: [ORANGE],
        legend: { enabled: false },
        credits: { enabled: false },
        tooltip: { enabled: false }
    });
}


// trace l'histogramme des réponses dans le div "reponses"
function init_graphe_reponses(nbr_reponses) {

    console.log("init_graphe_reponses()");

    // initialisation des données
    categories = [];
    data = [];
    for(i=1; i<=nbr_reponses; i++) {
        categories.push(i);
        data.push(0);
    }

    // traçage du graphe
    response_chart = Highcharts.chart("reponses", {
        chart: { type: 'column' },
        title: { text: '' },
        xAxis: {
            categories: categories,
            title: { text: "" }
        },
        yAxis: {
            min: 0,
            allowDecimals: false,
            title: { text: '' },
            labels: { overflow: 'justify' }
        },
        series: [{ data: data }],
        plotOptions: { bar: { dataLabels: { enabled: true } } },
        colors: [ORANGE],
        legend: { enabled: false },
        credits: { enabled: false },
        tooltip: { enabled: false },
    });
}


// trace le nuage des réponses dans le div "reponses"
function init_nuage_reponses() {

    console.log("init_nuage_reponses()");
    container_reponses = $('#reponses')
    container_reponses.empty();
    container_reponses.jQCloud([], params_nuage_mots);
}

// demande à jQCloud de recalculer explicitement la taille du nuage, ici la largeur,
// car si la zone "collapsible" qui le contient est repliée au départ,
// elle n'est pas connue (resté à la valeur par défaut de 100 px)
// tant que cette zone n'est pas dépliée
// cette fonction permet également d'adapter la taille du nuage si l'utilisateur
// retaille en largeur la fenêtre du navigateur
function adapte_taille_nuage_reponses() {

    console.log("adapte_taille_nuage_reponses()");

    $('#reponses').jQCloud('resize');
}

// trace l'histogramme des "je suis perdu" dans le div "perdus"
function make_graphe_perdus(container, duree, intervalles, ordonnees) {

    console.debug("make_graphe_perdus: durée =", duree, ", intervalles =", intervalles, ", ordonnees =", ordonnees);

    // initialisation des données
    abscisses = [];
    dt = duree/intervalles/60;
    for(i=intervalles; i>=0; i--)
        abscisses.push(-i*dt);

    // traçage du graphe
    perdus_chart = Highcharts.chart(container, {
        chart: { type: 'column' },
        title: { text: '' },
        xAxis: {
            categories: abscisses,
            title: { text: 'min' }
        },
        yAxis: {
            min: 0,
            allowDecimals: false,
            title: {
                text: '',
                align: 'high'
            },
            labels: { overflow: 'justify' }
        },
        series: [{
            data: ordonnees,
            dataLabels: {
                format: '<div style="text-align:center"><span style="font-size:25px;color:black">{y}</span><br/>'
            }
        }],
        plotOptions: { bar: { dataLabels: { enabled: true } } },
        colors: [ORANGE],
        legend: { enabled: false },
        credits: { enabled: false },
        tooltip: { enabled: false },
    });
}


// mise à jour de l'histogramme des étudiants perdus
function refresh_perdus(session, callback) {
    $.getJSON("/perdus/" + session, function(res) {
        if (res.erreur)
            console.log("perdus : erreur =", res.message);
        else {
            console.debug("perdus session =", session, ", ordonnées =", res.ordonnees);
            perdus_chart.series[0].setData(res.ordonnees, true, false);
        }
    }).always(callback);
};


// appel périodique de la mise à jour de l'histogramme des étudiants perdus
function periodic_refresh_perdus(session) {
    console.debug("periodic_refresh_perdus, session = ", session);
    refresh_perdus(session, function(res) {
        if (res.erreur)
            console.log("periodic_refresh_perdus, erreur =", res.message);
        else {
            console.debug("periodic_refresh_perdus, timeout =", 1000*res.duree/res.intervalles);
            setTimeout(periodic_refresh_perdus, 1000*res.duree/res.intervalles, session);
        }
    });
}


// initialisation du graphe des étudiants perdus avec chargement des données réelles
// et rafraichissement sur une période égale à la durée des intervalles pour décaler l'histogramme
function init_graphe_perdus(container, session) {
    $.getJSON("/perdus/" + session, function(res) {
        console.debug("init_graphe_perdus res =", res);
        make_graphe_perdus(container, res.duree, res.intervalles, res.ordonnees);
    }).always(function(res) {
        console.debug("période =", res.duree/res.intervalles);
        setTimeout(periodic_refresh_perdus, 1000*res.duree/res.intervalles, session);
    });
}


// init : true lors de la création initiale de ces boutons
//        false lors leur recréation après modificatin du nb de bonnes réponses
function affiche_boutons_choix_bonnes_reponses(init) {
    console.log("affiche_boutons_choix_bonnes_reponses()");
    var div_bonnes_reponses = $('#creation_question div.bonnes_reponses');
    var fieldset;   // des cases à cocher des réponses possibles

    if (init) {
        // création du <fieldset ... data-role="controlgroup"> qui va contenir les
        // cases à cocher affichées sous forme de boutons
        var code_fieldset = '<fieldset id="bonnes_reponses-fieldset" ' +
                                      'class="ui-block-b" ' +
                                      'data-role="controlgroup" ' +
                                      'data-type="horizontal">' +
                            '</fieldset>';
        fieldset = $(code_fieldset).insertAfter(div_bonnes_reponses);
        fieldset.parent().trigger('create');
    }
    else {
        // le <fieldset ... data-role="controlgroup"> existe déjà, il s'agit
        // d'une mise à jour suite au changement du nombre de bonnes réponses
        fieldset = $('#bonnes_reponses-fieldset');
    }

    // création des boutons-cases à cocher permettant d'indiquer
    // la véracité de chaque réponse
    var nb_reponses = $("#creation_question input[name='nbr_responses']").val();
    var container_reponses = fieldset.controlgroup('container');
    container_reponses.empty();
    for (i = 1 ; i <= nb_reponses; i++) {
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
    fieldset.enhanceWithin().controlgroup("refresh");

    // gestion du clic sur chaque bouton-case à cocher de réponse possible
    var boutons_reponses = fieldset.find(':checkbox');
    var champ_bonnes_reponses = $("#creation_question input[name='bonnes_reponses']");
    boutons_reponses.change(function () {
        // recalcul du champ "bonnes_reponses" qui est du type "2,3"
        // (les réponses n° 2 et 3 sont les bonnes réponses)
        //boutons_reponses.
        liste_bonne_reponses =
            fieldset.find(':checked').map(function () {
                return $(this).val()
            }).get().join(', ');
        champ_bonnes_reponses.val(liste_bonne_reponses);
    });

    // on peut maintenant cacher le champ de saisie "manuel" des bonnes réponses
    $('#creation_question div.bonnes_reponses').hide();
}


// envoi du nouveau titre de la question
function nouveau_titre_question() {

    iquiz = recall("iquiz");
    iquiz.data.titre = $("#nouveau_titre").val();
    console.debug("nouveau_titre_question: identifiant :", iquiz.question.session, ", numero :", iquiz.question.numero, ", titre :", iquiz.data.titre);
    envoi_message("maj_titre_question", iquiz.question, iquiz.data);
}

// mise à jour du titre de la question reçu
function maj_titre_question(question, data) {
    console.debug("traitement de l'événement maj_titre_question avec la valeur :", data.titre);
    $("input[name='titre']").val(data.titre);
    iquiz = recall("iquiz");
    iquiz.data.titre = data.titre;
    store("iquiz", iquiz);
}


// fonctions de traitement des messages ws entrants (appelées depuis onmessage)

// event question
// bascule l'enseignant sur la page de résultats
function question(question, data) {
    console.debug("traitement de l'événement question");
    envoi_message("AR", question, data);
    iquiz = recall("iquiz");
    update("iquiz", iquiz, "question", question);

    $("#numero").text(question.numero);
    $("#ordre").text(question.ordre);
    $("input[name='titre']").val(data.titre);
    $("span[name='delai']").text(data.delai);
    $("#nbr_responses_possibles").text(data.nbr_reponses);
    $("#nature").text(data.nature);
    $.mobile.changePage("#page-resultats", {transition: "slide", reverse: true, allowSamePageTransition: true, changeHash: false});
}


// event majdelai
// met à jour le délai de la question avec la valeur reçue de l'enseignant
function majdelai(question, data) {
    console.debug("traitement de l'événement delai avec la valeur " + data.delai);
    iquiz = recall("iquiz");
    iquiz.data.delai = data.delai;
    store("iquiz", iquiz);
    delai = data.delai;

    // initialise le délai
    if (illimite) {
        $("span[name='delai']").text(data.delai);
        lance_compte_a_rebours(data.nature);
    }
}


// event cloture_session
// redirige l'enseignant vers la page de sortie pour le déconnecter du serveur WS
function cloture_session(question) {
    console.debug("cloture de la session n°", question.session);
    window.location = "/sortie/"+question.session;
}
