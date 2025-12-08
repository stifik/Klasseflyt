# Klasseflyt - Design System

## Oversikt

Klasseflyt bruker et rent, profesjonelt design tilpasset lærere. Designet prioriterer lesbarhet, effektivitet og et rolig visuelt uttrykk som ikke distraherer fra oppgavene.

## Fargepalett

### Primærfarger

| Navn | Lys modus | Mørk modus | Bruk |
|------|-----------|------------|------|
| Primary | `hsl(222.2 47.4% 11.2%)` | `hsl(210 40% 98%)` | Hovedhandlinger, lenker |
| Secondary | `hsl(210 40% 96%)` | `hsl(217.2 32.6% 17.5%)` | Sekundære knapper |
| Accent | `hsl(210 40% 96%)` | `hsl(217.2 32.6% 17.5%)` | Hover, fokus |
| Muted | `hsl(210 40% 96%)` | `hsl(217.2 32.6% 17.5%)` | Bakgrunner, disabled |

### Semantiske farger

| Navn | Farge | Bruk |
|------|-------|------|
| Success/Godkjent | `#22c55e` (green-500) | Godkjente lekser, positive handlinger |
| Warning/Må rettes | `#f59e0b` (amber-500) | Advarsler, må rettes |
| Danger/Ikke levert | `#ef4444` (red-500) | Feil, ikke levert, slett |
| Info/Syk | `#3b82f6` (blue-500) | Info, syk/fravær |
| Glemt bok | `#f97316` (orange-500) | Glemt bok/utstyr |

### Status-farger for lekser

```typescript
const statusColors: Record<HomeworkStatus, string> = {
  "Godkjent": "#22c55e",
  "Må rettes": "#f59e0b",
  "Glemt bok": "#f97316",
  "Ikke levert": "#ef4444",
  "Syk/Fravær": "#3b82f6",
};
```

## Typografi

### Fonter

- **Primærfont**: System font stack (Inter-lignende)
  ```css
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, ...
  ```

### Størrelser

| Navn | Størrelse | Bruk |
|------|-----------|------|
| xs | 0.75rem (12px) | Hjelpetekst, metadata |
| sm | 0.875rem (14px) | Sekundær tekst, labels |
| base | 1rem (16px) | Brødtekst |
| lg | 1.125rem (18px) | Større tekst |
| xl | 1.25rem (20px) | Undertitler |
| 2xl | 1.5rem (24px) | Sidetitler |
| 3xl | 1.875rem (30px) | Hovedtitler |

### Vekter

- **Normal**: 400 - Brødtekst
- **Medium**: 500 - Labels, knapper
- **Semibold**: 600 - Undertitler
- **Bold**: 700 - Titler

## Spacing

Konsistent spacing-system basert på 4px grid:

| Navn | Verdi | Bruk |
|------|-------|------|
| 1 | 4px | Minimal spacing |
| 2 | 8px | Tett spacing, ikon-gap |
| 3 | 12px | Standard gap |
| 4 | 16px | Standard padding |
| 6 | 24px | Seksjon-spacing |
| 8 | 32px | Store gaps |
| 12 | 48px | Seksjon-separator |

## Komponenter

### Knapper

```tsx
// Primær handling
<Button>Lagre</Button>

// Sekundær handling
<Button variant="secondary">Avbryt</Button>

// Farlig handling
<Button variant="destructive">Slett</Button>

// Ghost/subtil
<Button variant="ghost">Mer info</Button>

// Outline
<Button variant="outline">Eksporter</Button>
```

### Kort (Cards)

Brukes for å gruppere relatert innhold:

```tsx
<Card>
  <CardHeader>
    <CardTitle>Tittel</CardTitle>
    <CardDescription>Beskrivelse</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Innhold */}
  </CardContent>
</Card>
```

### Tabeller

```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Kolonne</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>Data</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

### Modaler (Dialogs)

```tsx
<Dialog>
  <DialogTrigger asChild>
    <Button>Åpne</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Tittel</DialogTitle>
      <DialogDescription>Beskrivelse</DialogDescription>
    </DialogHeader>
    {/* Innhold */}
    <DialogFooter>
      <Button>Bekreft</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Toast-meldinger

```tsx
import { useToast } from "@/hooks/use-toast";

const { toast } = useToast();

// Suksess
toast({ title: "Lagret!", description: "Endringene er lagret." });

// Feil
toast({ 
  title: "Feil", 
  description: "Kunne ikke lagre.", 
  variant: "destructive" 
});
```

## Ikoner

Bruker Lucide React for konsistente ikoner:

```tsx
import { Plus, Trash2, Edit, Check, X, Loader2 } from 'lucide-react';

// Standard størrelse
<Plus className="h-4 w-4" />

// Med tekst
<Button>
  <Plus className="mr-2 h-4 w-4" />
  Legg til
</Button>

// Loading state
<Loader2 className="h-4 w-4 animate-spin" />
```

### Vanlige ikoner

| Ikon | Bruk |
|------|------|
| `Plus` | Legg til |
| `Trash2` | Slett |
| `Edit` / `Pencil` | Rediger |
| `Check` | Godkjent, bekreft |
| `X` | Lukk, avbryt |
| `Loader2` | Lasting (med animate-spin) |
| `ChevronDown/Up` | Expand/collapse |
| `Settings` | Innstillinger |
| `Download` | Last ned |
| `Upload` | Last opp |

## Layout

### Responsive breakpoints

```css
/* Tailwind breakpoints */
sm: 640px   /* Mobil landscape */
md: 768px   /* Tablet */
lg: 1024px  /* Desktop */
xl: 1280px  /* Stor desktop */
2xl: 1536px /* Ekstra stor */
```

### Sidelayout

```tsx
<div className="flex min-h-screen">
  {/* Sidebar - skjult på mobil */}
  <aside className="hidden md:flex w-64 border-r">
    <SidebarNav />
  </aside>
  
  {/* Hovedinnhold */}
  <main className="flex-1 overflow-y-auto p-4 sm:p-6">
    <PageHeader title="Sidetittel" />
    {/* Innhold */}
  </main>
</div>
```

### Grid-layouts

```tsx
// Responsive grid
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
  {items.map(item => <Card key={item.id} />)}
</div>

// To-kolonne layout
<div className="grid gap-6 lg:grid-cols-[1fr_300px]">
  <main>{/* Hovedinnhold */}</main>
  <aside>{/* Sidebar */}</aside>
</div>
```

## Dark Mode

Støttes via `next-themes`:

```tsx
// I komponenter
import { useTheme } from "next-themes";

const { theme, setTheme } = useTheme();

// Toggle
<Button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
  Toggle theme
</Button>
```

### Farger i dark mode

Bruk Tailwind's dark: prefix:

```tsx
<div className="bg-white dark:bg-slate-900">
  <p className="text-gray-900 dark:text-gray-100">Tekst</p>
</div>
```

## Animasjoner

### Subtile overganger

```tsx
// Hover-effekter
<Button className="transition-colors hover:bg-primary/90">

// Fade in
<div className="animate-in fade-in duration-200">

// Slide in
<div className="animate-in slide-in-from-bottom-2">
```

### Loading states

```tsx
// Spinner
<Loader2 className="h-4 w-4 animate-spin" />

// Skeleton
<Skeleton className="h-4 w-[200px]" />

// Pulse
<div className="animate-pulse bg-muted h-20 rounded" />
```

## Tilgjengelighet

### Fokus-stiler

Alle interaktive elementer har synlige fokus-stiler:

```tsx
<Button className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

### ARIA

```tsx
// Labels
<Label htmlFor="name">Navn</Label>
<Input id="name" aria-describedby="name-description" />
<p id="name-description" className="text-sm text-muted-foreground">
  Hjelpetekst
</p>

// Loading
<Button disabled aria-busy="true">
  <Loader2 className="animate-spin" aria-hidden="true" />
  Laster...
</Button>
```

## Print-stiler

For rapporter og utskrift:

```css
@media print {
  .no-print { display: none !important; }
  .print-only { display: block !important; }
  .page-break { page-break-before: always; }
}
```

```tsx
// Skjul på print
<Button className="no-print">Skriv ut</Button>

// Vis kun på print
<div className="hidden print-only">
  Kun synlig ved utskrift
</div>
```

---

## Dokumentvedlikehold

### Når oppdatere dette dokumentet
- Ved nye farger eller endringer i fargepalett
- Nye komponent-mønstre etableres
- Endringer i typografi eller spacing
- Nye UI-patterns tas i bruk

### Relaterte dokumenter
- `instructions.md` - Kode-standarder
- `architecture.md` - Komponent-struktur
- `roadmap.md` - Planlagte UI-forbedringer

---

## Sist oppdatert

**2025-12-08**: Initial versjon
- Dokumentert fargepalett og status-farger
- Beskrevet typografi og spacing-system
- Listet opp komponent-patterns
- Lagt til dark mode og print-stiler
