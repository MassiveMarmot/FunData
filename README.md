## Nederlands [(↓ English ↓)](#english)

[**FunData**](https://addons.mozilla.org/nl/firefox/addon/fundata-checkjeplek-op-funda/) - Zie op [Funda](https://funda.nl/) in één klik hoe de buurt ervoor staat volgens [CheckJePlek.nl](https://checkjeplek.nl/)

FunData is een Firefox extensie: https://addons.mozilla.org/en-GB/firefox/addon/fundata-checkjeplek-op-funda/

- Haalt omgevingsdata op van het adres van de aangeboden huur- of koopwoning, zodra je het paneel opent
- Opent in een zijpaneel op de pagina, via de FunData-knop naast "Kaart" of via het werkbalkpictogram; optioneel kun je het werkbalkpictogram een pop-out laten openen
- Toont RIVM-scores voor o.a. geluid, luchtkwaliteit en gevaarlijke
  stoffen, met dezelfde smiley-iconen als de officiële "Check je Plek"-tool
- Interactieve kaart ([Leaflet 🇺🇦](https://leafletjs.com/)) gecentreerd op het adres, met een
  optionele kadastrale-kaartlaag (PDOK/Kadaster) en een optionele
  [Leefbaarometer](https://www.leefbaarometer.nl/)-laag (standaard uit)
- Links naar Atlas Leefomgeving (met adres ingevuld) en naar de Leefbaarometer-kaart
- Licht/donker thema, automatisch op basis van je browser- of
  systeeminstelling, met handmatige schakelaar
- Instelbaar: taal (Nederlands/Engels), scores als iconen of als tekstlabels,
  statische of dynamische kaart, en wat het werkbalkpictogram doet

**Architectuur en privacy**

- Werkt volledig via directe aanroepen naar open overheids-API's (PDOK
  voor geocoding, RIVM/Sogelink voor omgevingsdata, en optioneel de
  Leefbaarometer) — geen scraping en geen verborgen iframe van Funda of
  derden
- Het adres van de pagina die je bekijkt wordt verstuurd naar deze
  Nederlandse overheids-API's om de opzoeking uit te voeren
- Kaarttegels haalt je browser rechtstreeks op bij PDOK, en bij de
  Leefbaarometer alleen als je die laag aanzet. De tegelcoördinaten geven
  daarmee bij benadering de locatie van het adres prijs aan die servers
- Er wordt niets opgeslagen behalve je eigen instellingen, lokaal in de
  browser
- Open source (MPL-2.0), broncode volledig beschikbaar op GitHub:
  https://github.com/MassiveMarmot/FunData/

**Disclaimer**

FunData is een onafhankelijk hobbyproject. FunData is niet gelieerd aan, goedgekeurd door, of gesponsord door Funda Real Estate B.V. "Funda" is hun handelsmerk; FunData werkt alleen aanvullend op hun website.

---

## English

[**FunData**](https://addons.mozilla.org/en-GB/firefox/addon/fundata-checkjeplek-op-funda/) shows you how a neighbourhood measures up according to [CheckJePlek.nl](https://checkjeplek.nl/) right on a [Funda](https://funda.nl/) listing page

- Fetches neighbourhood data for the address of a property for sale or rent
  as soon as you open the panel
- Opens in an in-page side panel, via the FunData button next to "Kaart" or
  the toolbar icon; optionally the toolbar icon can open a pop-out instead
- Displays RIVM scores for things like noise, air quality and hazardous
  substances, using the same smiley icons as the official "Check je
  Plek" tool
- Interactive map ([Leaflet 🇺🇦](https://leafletjs.com/)) centred on the address, with an optional
  cadastral boundary overlay (PDOK/Kadaster) and an optional
  [Leefbaarometer](https://www.leefbaarometer.nl/) livability layer (off by default)
- Links to Atlas Leefomgeving (address pre-filled) and to the Leefbaarometer map
- Light/dark theme, auto-detected from your browser or system
  preference, with a manual override switch
- Configurable: language (Dutch/English), icon or text-label scores, static or
  dynamic map, and what the toolbar icon does

**Architecture and privacy**

- Works entirely through direct calls to open Dutch government APIs
  (PDOK for geocoding, RIVM/Sogelink for neighbourhood data, and
  optionally the Leefbaarometer) — no scraping and no hidden iframe of
  Funda or any third party
- The address of the page you're viewing is sent to these Dutch
  government APIs to perform the lookup
- Map tiles are fetched by your browser directly from PDOK, and from the
  Leefbaarometer only if you turn that layer on. Tile coordinates
  therefore reveal the approximate location of the address to those servers
- No tracking, no analytics, no telemetry
- Nothing is stored beyond your own settings, kept locally in the
  browser
- Open source (MPL-2.0), full source available on GitHub:
  https://github.com/MassiveMarmot/FunData/

**Disclaimer**

FunData is an independent hobby project. FunData is not affiliated with, endorsed by, or sponsored by Funda Real Estate B.V. "Funda" is their trademark; FunData simply works alongside their website.
