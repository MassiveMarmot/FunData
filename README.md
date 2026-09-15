## Nederlands [(↓ English ↓)](#english)

[**FunData**](https://addons.mozilla.org/nl/firefox/addon/fundata-checkjeplek-op-funda/) - Zie op [Funda](https://funda.nl/) in één klik hoe de buurt ervoor staat volgens [CheckJePlek.nl](https://checkjeplek.nl/)

Fundata is een Firefox extensie: https://addons.mozilla.org/en-GB/firefox/addon/fundata-checkjeplek-op-funda/

- Haalt automatisch omgevingsdata op van het adres van de aangeboden huur- of koopwoning
- Toont RIVM-scores voor o.a. geluid, luchtkwaliteit en gevaarlijke
  stoffen, met dezelfde smiley-iconen als de officiële "Check je Plek"-tool
- Interactieve kaart (Leaflet) gecentreerd op het adres, met een
  optionele kadastrale-kaartlaag (PDOK/Kadaster)
- Licht/donker thema, automatisch op basis van je browser- of
  systeeminstelling, met handmatige schakelaar
- Instelbaar: scores als iconen of als tekstlabels, statische of
  dynamische kaart

**Architectuur en privacy**

- Werkt volledig via directe aanroepen naar open overheids-API's (PDOK
  voor geocoding, RIVM/Sogelink voor omgevingsdata) — geen scraping en
  geen verborgen iframe van Funda of derden
- Het adres van de pagina die je bekijkt wordt verstuurd naar deze
  Nederlandse overheids-API's om de opzoeking uit te voeren; dat is de
  enige gegevensoverdracht die de extensie doet
- Geen tracking, geen analytics, geen telemetrie
- Er wordt niets opgeslagen behalve je eigen instellingen, lokaal in de
  browser
- Open source (MPL-2.0), broncode volledig beschikbaar op GitHub:
  https://github.com/MassiveMarmot/FunData/

## Disclaimer

FunData is an onafhankelijk hobbyproject. FunData is niet gelieerd aan, goedgekeurd door, of gesponsord door Funda Real Estate B.V. "Funda" is hun handelsmerk; FunData werkt alleen aanvullend op hun website.

---

## English

[**FunData**](https://addons.mozilla.org/en-GB/firefox/addon/fundata-checkjeplek-op-funda/) shows you how a neighbourhood measures up according to [CheckJePlek.nl](https://checkjeplek.nl/) right on a [Funda](https://funda.nl/) listing page

- Automatically fetches neighbourhood data when you activate the extension on a
  property detail page on Funda (for sale and for rent)
- Displays RIVM scores for things like noise, air quality and hazardous
  substances, using the same smiley icons as the official "Check je
  Plek" tool
- Interactive map (Leaflet) centred on the address, with an optional
  cadastral boundary overlay (PDOK/Kadaster)
- Light/dark theme, auto-detected from your browser or system
  preference, with a manual override switch
- Configurable: icon or text-label scores, static or dynamic map

**Architecture and privacy**

- Works entirely through direct calls to open Dutch government APIs
  (PDOK for geocoding, RIVM/Sogelink for neighbourhood data) — no
  scraping and no hidden iframe of Funda or any third party
- The address of the page you're viewing is sent to these Dutch
  government APIs to perform the lookup; that's the only data
  transmission the extension does
- No tracking, no analytics, no telemetry
- Nothing is stored beyond your own settings, kept locally in the
  browser
- Open source (MPL-2.0), full source available on GitHub:
  https://github.com/MassiveMarmot/FunData/

## Disclaimer

FunData is an independent hobby project. FunData is not affiliated with, endorsed by, or sponsored by Funda Real Estate B.V. "Funda" is their trademark; FunData simply works alongside their website.
