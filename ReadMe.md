## WI-403-12-Run
Dieses Spiel ist ein Jump'N'Run bei dem bis zu 4 Spieler gegeneinander antreten können.

### Spezifikation
- einfaches Jump'N'Run Game
- Lobby zum einfachen Anmelden mit Nutzernamen und Beitritt in ein Spiel oder öffnen eines neuen Spiels
- in ein offenes Spiel können bis zu vier Spieler
- Die Welt wird durchschritten und der erste Spieler am Ziel gewinnt
- Gegner werden auf dem Weg platziert und sind in der Lage Spieler aus dem Spiel zu befördern oder zu verlangsamen

### Umsetzung
Die Umsetzung erfolgt in Javascript. Für die Synchronisation der Daten zwischen den Nutzern wird PHP in Verbindung mit einer MySQL-Datenbank genutzt.

Der Javascript-Quellcode wird über Unit-Tests mit QUnit getestet.