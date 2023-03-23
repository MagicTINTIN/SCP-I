aloop = 0;
xvar = 0;
pas = .5;
for (let index = 0; index < 10 * Math.cos(xvar); index++) {
    setTimeout(() => {
        envoi_message("perdu", { "session": sessionNB, "numero": qnb }, { "UUID": UUIDuser, "role": "A" });
    }, 500);
}
xvar += pas;
loopFunction = setInterval(() => {
    for (let index = 0; index < 10 * Math.cos(xvar); index++) {
        setTimeout(() => {
            envoi_message("perdu", { "session": sessionNB, "numero": qnb }, { "UUID": UUIDuser, "role": "A" });
        }, 500);
    }
}, 30000);