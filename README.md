# Simple Client Pour Iquiz (SCP I)
C'est juste un client pour Iquiz, rien de plus

Open your web browser, connect to your iquiz session and start the js console (by pressing ctrl+maj+i or f12).

Now you can just type jeSuisPerdu(10, 4500) to send 10 times "Je suis perdu" in 4,5 seconds
If you want you can use sinPerdu(Math.sin,10,0.8,5, 30) to create a beautiful wave of lost students between 5 and 15 students each minute during 30 minutes

You can also type jeReponds(35, 5000, [3]) to send 35 answer 3 in 5 seconds
If you want to answer multiple answer like 1 and 3, just type jeReponds(35, 5000, [1,3])

You can add other functions after as done below and call the functions as you want in fctPerdu, just replace Math.sin by your function name.
for instance :
fctPerdu(asimplefunction, 10, 0.8, 3, 30)