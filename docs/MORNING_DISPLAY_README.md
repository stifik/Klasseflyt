# Morning Display - Brukerguide

## Oversikt
Morning Display er et dynamisk morgenvisnings-system som kombinerer innsjekking med dagsinformasjon. Systemet vises på storskjerm/projektor og gir elevene umiddelbar visuell feedback når de sjekker inn.

## Funksjoner

### ✨ Slide 1 - Innsjekking & Velkomst
- **Digital klokke** med fargekoding basert på innsjekking-trapp (grønn/gul/oransje/rød)
- **Elevliste** (30% av bredden) med live-oppdatering av innsjekking-status
- **Velkomstmelding og instruksjoner** (70% av bredden)
- **Animert bakgrunn** med vakre gradienter som roterer daglig

### 📅 Slide 2 - Dagsplan
- Oversikt over dagens økter og aktiviteter
- Redigeringsmodus for enkelt å oppdatere planen
- Støtte for ukesmaler som automatisk laster

### 🎨 Tema-system
- 15 forhåndsdefinerte vakre gradienter
- Automatisk rotasjon hver dag (samme tema hele dagen)
- Smooth animert bakgrunn

## Hurtigstart

### 1. Konfigurasjon
1. Gå til **Innstillinger → Morning Display**
2. Sett **klassenavn** (f.eks. "Superklassen")
3. Importer **velkomstmeldinger** (10-20 stykker)
   - Bruk ChatGPT for inspirasjon!
   - Én melding per linje
   - Kan bruke `{klassenavn}` som placeholder
4. Importer **instruksjoner** (5-10 stykker)
   - F.eks. "Sjekk inn på Teams, hent mikrofon og les stille i boka di"

### 2. Åpne Morning Display
1. Gå til **Dashboard** og klikk på **Morning Display**-kortet
2. Alternativt: Naviger direkte til `/morning-display`
3. Trykk **F11** for fullskjerm
4. Plasser vinduet på storskjerm/projektor

### 3. Daglig bruk
1. **Åpne Morning Display** på storskjermen før morgenen starter
2. **Åpne "Daglig sjekk"** på din PC med NFC-leser
3. Elevene sjekker inn med RFID-kort
4. Se live-oppdatering på storskjermen:
   - Grå ramme → ikke sjekket inn ennå
   - Grønn ramme → sjekket inn (animasjon!)
   - Nedtonet (50% opacity) → fraværende

### 4. Navigasjon
- **Piltaster** (← →) for å bytte mellom slides
- **Knapper** nederst på skjermen
- **Slide 1**: Innsjekking og velkomst
- **Slide 2**: Dagsplan

## Innstillinger

### Klassenavn
Brukes i velkomstmeldinger. Eksempel:
- "God morgen, {klassenavn}!" → "God morgen, Superklassen!"

### Rotasjonsmodus
**Velkomstmeldinger og instruksjoner:**
- **Daglig**: Samme melding hele dagen
- **Per ringetid**: Ny melding ved hver ringetid

### Velkomstmeldinger
Eksempler:
```
God morgen, {klassenavn}!
Velkommen til en ny dag full av læring!
Hei igjen! Klar for å gjøre ditt beste?
Flott å se dere! La oss ha en super dag!
God morgen! Husk å være snille med hverandre i dag.
```

### Instruksjoner
Eksempler:
```
Sjekk inn på Teams, hent mikrofon og les stille i boka di
Logg på PC-en, åpne dagens oppgaver og kom i gang
Finn frem bøkene til dagens fag og gjør deg klar
Hent iPad, åpne Showbie og se på dagens leksjon
```

## Dagsplan (Slide 2)

### Visning
- Viser dagens dato automatisk
- Låst visning som standard (🔒)

### Redigering
1. Klikk på **🔓 Rediger**
2. Legg til økter med **+ Legg til økt**
3. Rediger tid, fag og tema
4. Slett økter med 🗑️-knappen
5. Klikk **✅ Lagre** for å lagre endringer

### Ukesmaler
- **Mandag-mal**, **Tirsdag-mal**, osv.
- Laster automatisk basert på dagens ukedag
- Kan opprettes og redigeres i innstillinger

## Integrasjon med innsjekking

### Live-oppdatering
Morning Display oppdaterer seg automatisk når:
- En elev sjekker inn på NFC-leseren
- Innsjekking-status endres
- Elever markeres som fraværende

### Fraværsregistrering
- Skjer automatisk etter innstilt tid (standard: 7 minutter)
- Elevkort blir nedtonet til 50% opacity
- Påvirker også elevtrekker (fraværende kan ikke trekkes)

### Klokke-fargekoding
Følger samme trapp som innsjekking:
- **Grønn** (0-3 min): 100% poeng
- **Gul** (3-5 min): 50% poeng
- **Oransje** (5-7 min): 10% poeng
- **Rød** (7+ min): For sent

## Tips & Tricks

### 💡 Velkomstmeldinger fra ChatGPT
Bruk denne prompten:
```
Gi meg 20 morsomme og positive velkomstmeldinger til elever
som starter dagen. Bruk {klassenavn} som placeholder.
```

### 💡 Instruksjoner
- Hold dem korte og tydelige
- Bruk punktliste hvis flere oppgaver
- Roter dem for å holde det interessant

### 💡 Dagsplan
- Legg inn alle pauser og lunsjpauser
- Inkluder spesialtimer (gym, musikk, etc.)
- Oppdater tema-feltet for å gi elevene innsikt

### 💡 Tema
- Temaet roterer automatisk hver dag
- Samme tema hele dagen for konsistens
- Smooth animasjon gjør det levende uten å distrahere

## Feilsøking

### Elevlisten oppdateres ikke
- Sjekk at "Daglig sjekk" er åpen på lærerens PC
- Refresh Morning Display-siden
- Sjekk at NFC-systemet fungerer

### Ingen dagsplan vises
- Opprett en mal for dagens ukedag i innstillinger
- Eller rediger dagsplanen direkte i Slide 2

### Ingen meldinger vises
- Importer meldinger i innstillinger
- Default-meldinger vises hvis ingen er lagt til

### Tema endrer seg ikke
- Tema roterer kun én gang per dag (ved første åpning)
- Lukk og åpne på ny dag for nytt tema

## Teknisk informasjon

### Arkitektur
- **Frontend**: Next.js 15, React, TypeScript
- **Database**: Dexie (IndexedDB)
- **Styling**: Tailwind CSS + Custom CSS
- **Live-oppdatering**: Polling (2 sekunder)

### Filer
```
src/
├── app/
│   ├── morning-display/
│   │   ├── page.tsx              # Hovedside
│   │   └── morning-display.css   # Styling
│   └── settings/
│       └── morning-display/
│           └── page.tsx           # Innstillinger
├── components/
│   └── morning-display/
│       ├── Clock.tsx              # Digital klokke
│       ├── StudentList.tsx        # Elevliste
│       ├── WelcomeSection.tsx     # Velkomst
│       ├── Slide1.tsx             # Slide 1
│       ├── Slide2.tsx             # Slide 2
│       └── SlideControls.tsx      # Navigasjon
└── lib/
    ├── themes.ts                  # Tema-konfigurasjon
    └── db.ts                      # Database (oppdatert)
```

### Database-tabeller
- `welcomeMessages`: Velkomstmeldinger
- `instructionMessages`: Instruksjoner
- `scheduleTemplates`: Dagsplan-maler
- `themeHistory`: Tema-historikk
- `settings.morningDisplaySettings`: Innstillinger

## Fremtidige funksjoner (valgfritt)

- [ ] WebSocket for sanntids-oppdatering (i stedet for polling)
- [ ] Browser-notifikasjoner 2 min før ringetid
- [ ] Drag-and-drop for å rekkefølge økter
- [ ] Lagre custom dagsplan-maler
- [ ] Statistikk over innsjekking
- [ ] Elever kan "kjøpe" dagens tema for poeng
- [ ] AI-genererte bakgrunnsbilder

---

**Laget med ❤️ for Klasseflyt**
