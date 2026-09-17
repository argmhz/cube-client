# cube-client

Web-baseret fjernbetjening til [`cube`](../cube) — frontend'en til den fysiske 8×8×8 RGB LED-kube ("Topper 3D"). Viser en liste af tilgængelige animationer og bygger automatisk et kontrolpanel (farver, hastighed, tekst osv.) ud fra hvilken animation der er valgt.

## Arkitektur

```
Browser (www/index.html, Bootstrap 5)
   │  WebSocket (/ws)
   ▼
index.js (Node/Express)  ── TCP↔WebSocket-bro
   │  rå TCP, JSON, localhost:1234
   ▼
cube-serveren (apps/socket.cpp i cube-repoet)
```

`cube-client` er bevidst tyndt: det er ikke selv "smart" omkring animationer eller protokollen — det åbner en almindelig TCP-forbindelse til cube-serveren og videresender JSON-beskeder ubeskåret begge veje mellem den forbindelse og en WebSocket i browseren, fordi en browser ikke kan åbne rå TCP-sockets selv.

- **`index.js`** — hele backend'en. Forbinder til `localhost:1234` (cube-serveren), serverer `www/` som statiske filer på port 3000, og eksponerer WebSocket-broen på `/ws`.
- **`www/index.html`** — hele frontend'en i én fil: opretter WebSocket-forbindelsen, henter listen af animationer, bygger kontrolformularen dynamisk, og sender `set`-beskeder når felter ændres.
- **`www/data/*.json`** — ét skema pr. animation, der beskriver hvilke inputfelter kontrolpanelet skal vise for den animation (se "Animationsskemaer" nedenfor).

## Opsætning & kørsel

Kræver at cube-serveren (`bin/socket` i `cube`-repoet) allerede kører og lytter på `localhost:1234`, før `cube-client` startes — der er ingen genopkoblingslogik hvis forbindelsen ikke kan oprettes (se "Kendte begrænsninger").

```bash
npm install
node index.js
```

Åbn derefter `http://localhost:3000` i browseren.

## Protokol

Samme JSON-protokol som cube-serveren dokumenterer i sin egen README — `cube-client` implementerer ikke sin egen logik omkring den, den sender og modtager blot disse beskeder direkte:

**Klient → server**
```json
{"action": "options"}
{"action": "select", "animation": "ColorWheel"}
{"action": "set", "speed": 20000}
```

**Server → klient**
```json
{"action": "options", "animations": ["ColorWheel", "FadeColor", ...]}
```

Dropdown'en i UI'et bygges direkte fra `options`-svaret, og sender præcis den samme streng tilbage i en `select`-besked, når en animation vælges — `cube-client` ændrer eller fortolker ikke selv navnet.

## Animationsskemaer (`www/data/*.json`)

Når en animation vælges, henter siden `www/data/<navn>.json` og bygger et formularfelt for hver indgang i `fields`. Findes filen ikke, vises der bare ingen kontroller for den animation (den kan stadig vælges og køre med sine indbyggede standardværdier).

Format pr. felt:

| Egenskab | Betydning |
|---|---|
| `name` | Feltets navn — sendes som JSON-nøgle i `set`-beskeden |
| `datatype` | `"integer"` eller `"string"` — styrer om værdien parses som tal før afsendelse |
| `label` | Dansk label vist i UI'et |
| `type` | HTML input-type (`"range"`, `"number"`, `"select"`, `"button"`), udeladt giver et almindeligt tekstfelt |
| `min` / `max` / `value` | Grænser og startværdi for `range`/`number`-felter |
| `options` | Kun for `type: "select"` — liste af `{value, label}` |

Eksempel (`www/data/Rain.json`):
```json
{
  "fields": [
    {"name": "speed", "datatype": "integer", "label": "Hastighed", "type": "range", "min": 0, "max": 400000, "value": 65000},
    {"name": "max_drops", "datatype": "integer", "label": "Antal", "type": "number", "min": 0, "max": 100, "value": 4}
  ]
}
```

Der findes i dag skemaer for 8 af de mange animationer i `cube` (`BouncyvTwo`, `ColorWheel`, `DoubleHelix`, `Lamp`, `Rain`, `Spiral`, `Text`, `Wipeout`) — resten kan stadig vælges og køre, bare uden kontrolpanel.

## Kendte begrænsninger

- **Ingen genopkobling**: `index.js` forbinder til cube-serveren én gang ved opstart (`client.connect(1234, 'localhost', ...)`), og både webserveren og WebSocket-broen sættes først op *inde i* den forbindelses callback. Er cube-serveren ikke allerede oppe, starter `cube-client` slet ikke sin webside. Falder forbindelsen efterfølgende, er der ingen automatisk gendannelse.
- **Ingen fejlhåndtering på TCP-forbindelsen**: der er ikke sat en `error`-listener på `client` (TCP-socket'en) — en uventet netværksfejl vil derfor crashe hele Node-processen i stedet for at blive håndteret.
