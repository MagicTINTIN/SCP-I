// When you are connected to your iquiz session, open your js console in your webbrowser (might be ctrl+maj+i or f12) and copy paste theses functions below
function jeSuisPerdu(nb, time) {

    var rep=0;
    var loopFunction = setInterval(() => {
        if (rep < nb)
            envoi_message("perdu", { "session": iquiz.question.session, "numero": iquiz.question.numero }, { "UUID": iquiz.data.UUID, "role": "A" });
        else
            clearInterval(loopFunction);
        rep++;
    }, time/nb);
}

//answers = [2,4] pour répondre aux questions 2 et 4
function jeReponds(nb, time, answers) {

    var rep=0;
    var loopFunction = setInterval(() => {
        if (rep < nb)
        envoi_message("reponse",{"session":iquiz.question.session,"numero":iquiz.question.numero,"ordre":iquiz.question.ordre},{"UUID":iquiz.data.UUID,"role":iquiz.data.role,"nbr_reponses":iquiz.data.nbr_reponses,"reponses":answers,"nature":"Q"})
        else
            clearInterval(loopFunction);
        rep++;
    }, time/nb);
}

// pour faire des courbes sur le grphique des perdus
function sinPerdu(offset, freq, maxsteps) {
    jeSuisPerdu(offset + offset/2*Math.sin(0), 45000);
    var rep = 1;
    var loopFunction = setInterval(() => {
        if (rep < maxsteps)
            jeSuisPerdu(offset + offset/2*Math.sin(freq*rep), 45000);
        else
            clearInterval(loopFunction);
        rep++;
    }, 61000);
}

//////////////////// End of functions \\\\\\\\\\\\\\\\\\\\ 
/*
 * Now you can just type jeSuisPerdu(10, 4500) to send 10 times "Je suis perdu" in 4,5 seconds
 * If you want you can use sinPerdu(10,0.8,15) to create a beautiful wave of lost students between 5 and 15 students each minute during 15 minutes
 * 
 * You can also type jeReponds(35, 5000, [3]) to send 35 answer 3 in 5 seconds
 * If you want to answer multiple answer like 1 and 3, just type jeReponds(35, 5000, [1,3])
 * 
 */