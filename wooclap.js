fetch("https://app.wooclap.com/api/presentation/events/ZAMXCN/reactions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "bearer z824053499345"
    },
    body: JSON.stringify({emoji: "👍"}),
});

first = setInterval(() => {
    fetch("https://app.wooclap.com/api/presentation/events/ZAMXCN/reactions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "bearer z824053499345"
        },
        body: JSON.stringify({emoji: "🔥"}),
    });
}, 2000);

// Version amélioréee
const token = localStorage.getItem('token');
setInterval(() => {
    fetch('https://app.wooclap.com/api/presentation/events/ZAMXCN/reactions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'bearer ' + token
        },
        body: '{"emoji": ":fire:"}'
    })
}, 600);
localStorage.removeItem('token') // to copy paste on several pages of the same browser