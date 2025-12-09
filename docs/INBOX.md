# Klasseflyt - INBOX

> **Dette er din idé-samling!** 
> Legg til bugs, feature-ønsker, tanker og ting du vil at appen skal ha.
> KI-assistenten sjekker denne filen regelmessig og flytter innhold til riktig sted.

---

## 🐛 Bugs

<!-- 
Beskriv problemet så detaljert som mulig:
- Hva gjorde du?
- Hva forventet du skulle skje?
- Hva skjedde i stedet?
- Hvilken side/komponent gjelder det?
-->

Når jeg åpner "Morning display" er skriften (morgenmelding eller hva det heter) veldig liten. Når jeg justerer størrelsen på vinduet, blir skriften stor slik den skal være.

*(Ingen åpne bugs)*

<!-- 
FIKSET 2025-12-08: NFC-leser referanseproblem
Problemet var at reader-objektet ble sammenlignet med referanse (===) 
istedenfor navn. Ved reconnect ble ny referanse ikke oppdatert.
Løsning: Endret til navnesammenligning + oppdatering av referanser ved reconnect.

FIKSET 2025-12-09: NFC-leser sluttet å lese etter reader-bytte
Problemet var at leseren har to identiteter (PICC Reader og 040229-variant).
Når den ene forsvant, byttet den til den andre, men når originalen kom tilbake
ble den ikke satt som currentReader igjen.
Løsning: Les fra HVILKEN SOM HELST leser som detekterer et kort når monitoring er aktivt.
-->


---

## 💡 Feature-ønsker

<!-- 
Beskriv hva du ønsker:
- Hvilken funksjonalitet?
- Hvorfor er det nyttig?
- Hvordan skal det fungere?
-->



---

## 🎨 Design/UX-forbedringer

<!-- 
Ting som kan gjøres bedre:
- For mange klikk for å gjøre X
- Forvirrende tekst/ikoner
- Ting som burde være mer synlig
-->

Toast-meldinger når man sjekker inn (og andre meldinger i samme kategori, som fravær registrert) kan godt forsvinne etter 3-5 sekunder, de trenger ikke stå på skjermen til de blir krysset vekk. NB, den "innsjekking starter" meldingen kan godt stå til det skjer noe med den, samme med backup-meldingen.

---

## 🔧 Tekniske ting

<!-- 
Tekniske ønsker:
- Ytelse
- Integrasjoner
- Refaktorering
-->
Fjerne referanser til Plausible, det brukes ikke lenger. Bruker Vercel Analytics isteden.


---

## 📝 Notater

<!-- 
Andre tanker og ideer som ikke passer andre steder
-->



---

## Dokumentvedlikehold

### Hvordan denne filen brukes

1. **Du (bruker)**: Legg til hva som helst her - bugs, ideer, frustrasjoner
2. **KI-assistenten**: Sjekker filen ved start av hver økt
3. **Behandling**:
   - Bugs → Fikses eller legges i `roadmap.md`
   - Features → Flyttes til `roadmap.md`
   - Design → Flyttes til `design.md` eller `roadmap.md`
   - Teknisk → Flyttes til `architecture.md` eller `roadmap.md`
4. **Etter behandling**: Innholdet markeres som flyttet eller slettes

### Tips for gode bug-rapporter
```
**Bug**: [Kort beskrivelse]
**Side**: /reports
**Steg**: 
1. Åpne rapporter
2. Klikk på "Last ned PDF"
3. Ingenting skjer

**Forventet**: PDF lastes ned
**Faktisk**: Spinner som aldri stopper
```

### Tips for gode feature-ønsker
```
**Feature**: [Kort beskrivelse]
**Hvorfor**: Spar tid på å gjøre X manuelt
**Hvordan**: 
- Knapp på dashboard
- Åpner modal med valg
- Genererer rapport automatisk
```

---

## Sist oppdatert

**2025-12-08**: Opprettet INBOX
- Lagt til seksjoner for bugs, features, design, teknisk
- Dokumentert hvordan filen brukes
- Lagt til tips for gode rapporter
