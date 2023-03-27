// Open your js console and copy paste

loopFunction = setInterval(() => {
    
    envoi_message("perdu", { "session": iquiz.question.session, "numero": iquiz.question.numero }, { "UUID": iquiz.data.UUID, "role": "A" });
    
}, 200);


loopFunction = setInterval(() => {
    envoi_message("reponse",{"session":iquiz.question.session,"numero":iquiz.question.numero,"ordre":iquiz.question.ordre},{"UUID":iquiz.data.UUID,"role":iquiz.data.role,"nbr_reponses":iquiz.data.nbr_reponses,"reponses":[2,4],"nature":"Q"})
}, 200);

clearInterval(loopFunction);