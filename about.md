Utilita pro slučování souborů. utilita umí:

* Spravovat projekty v levém panelu — vytvářet, přepínat kliknutím, přejmenovávat a mazat projekty (inline tlačítka u každého projektu)
* Persistentně ukládat nahrané soubory do IndexedDB — soubory přežijí zavření prohlížeče
* Automaticky obnovit poslední aktivní projekt při spuštění aplikace
* Nahrávat soubory přetažením (drag & drop) — dropzona se zobrazí přes celou oblast hlavního obsahu (main-content) když projekt nemá žádné soubory, po přidání souborů se při přetahování zobrazí overlay přes celou viditelnou oblast main-content s fixní pozicí (neroste s obsahem)
* Zachytávat kompletní cesty souborů přes skrytý textarea při přetažení
* Řadit soubory přetažením v seznamu (drag & drop reorder)
* Přepínač zobrazení seznamu souborů — režim seznam (list) a dlaždice (tiles) s přepínačem v toolbaru nad seznamem. Dlaždice zobrazují kompaktně ikonu, název souboru (zkrácený pokud se nevejde), zkrácenou cestu (direction: rtl, zobrazuje konec cesty, celá cesta se zobrazí jako title tooltip při hoveru, tooltip se potlačí během přetahování) a velikost. V obou režimech je číslování pořadí a funguje drag & drop reorder. Preference se ukládá do localStorage
* Barevně odlišit typ souboru v seznamu podle přípony
* Odebírat jednotlivé soubory tlačítkem ✕
* Sloučit všechny soubory do jednoho textového výstupu ve formátu `cesta:\nobsah`
* Přepínač pro zapnutí/vypnutí vkládání cesty k souboru do výstupu (defaultně zapnutý)
* Přepínač pro oříznutí prázdných řádků na začátku a konci obsahu každého souboru ve výstupu (defaultně vypnutý)
* Zobrazit sloučený výstup s číslováním řádků (čísla nejsou součástí textu — nejdou kopírovat)
* Zobrazit sloučený výstup s omezením na 20 000 řádků s upozorněním na zkrácení
* Zobrazit sloučený výstup se syntax highlightingem podle typu souboru (HTML, XML/SVG, JS, TS, TSX/JSX, PHP, JSON, YAML/YML, NEON, Latte, Blade, CSS/SCSS/LESS) — jazyk se detekuje z přípony v hlavičce každé sekce, názvy souborů jsou zvýrazněny neonově zeleně, highlighting je čistě vizuální a není součástí kopírovaného ani staženého textu
* Zkopírovat sloučený obsah do schránky (bez čísel řádků a bez syntax highlightingu) — používá nativní Clipboard API (`navigator.clipboard.writeText`), pokud kopírování selže, zobrazí se upozornění
* Stáhnout sloučený obsah s možností zvolit název souboru a formát (txt, md, json, xml, csv, html, log) — výchozí název `merged-files`, výchozí formát `.txt`, výběr přes modální dialog
* Slučování PDF souborů — automatická detekce PDF souborů v seznamu, tlačítko „Download PDF" se zobrazí jakmile je v seznamu alespoň jeden PDF soubor. Pokud jsou všechny soubory PDF, sloučí se do jednoho PDF. Pokud jsou v seznamu i textové soubory, jejich obsah se převede na PDF stránky (Courier, A4, automatické zalamování řádků) a vloží do výsledného PDF. Používá knihovnu pdf-lib.
* Přepínač „Převést PDF dokumenty na text" — zobrazí se jen pokud je v seznamu alespoň jeden PDF soubor, defaultně zapnutý. Když je aktivní, z PDF souborů se extrahuje text (pomocí pdfjs-dist) a vloží do merged výstupu místo placeholderu `[PDF – binární obsah]`. Když je vypnutý, zobrazí se původní placeholder. Preference se ukládá do localStorage. Extrakce textu řadí textové prvky podle vizuální pozice (Y shora dolů, X zleva doprava), seskupuje je do řádků na základě výšky fontu a vkládá mezery/tabulátory podle horizontálních vzdáleností mezi prvky.
* Vlastní texty (custom text) — možnost vkládat vlastní textové záznamy mezi soubory pomocí fialového tlačítka „Přidat text" v toolbaru. Vlastní texty mají povinný nadpis (validace s chybovou hláškou při prázdném nadpisu) a volitelný obsah, zobrazují se ve výpisu vedle souborů s fialovým barevným odlišením (border, ikona, nadpis). V režimu seznam i dlaždice zobrazují nadpis místo názvu souboru a náhled obsahu místo cesty. Každý vlastní text má individuální přepínač, zda se má nadpis propsat do exportu (defaultně zapnutý). Při sloučení se chovají jako .md soubory (plaintext, bez syntax highlightingu). Editace kliknutím na fialovou ikonu tužky (ikona při hoveru zvýrazní a zvětší jako indikace klikatelnosti) nebo dvojklikem na celou dlaždici — otevře zvětšený modální dialog s nadpisem, pozicí (číslo 1–N, default 1 pro nový, aktuální pro editaci, max = počet položek +1 pro nový / počet položek pro editaci), textareou pro obsah a přepínačem vložení nadpisu do exportu. Nadpisy vlastních textů jsou ve výstupu zvýrazněny fialově (#a78bfa). Podporují drag & drop řazení spolu s ostatními soubory. Persistentně se ukládají do IndexedDB jako součást projektu.
* Nahrávání souborů z GitHub repozitáře — tlačítko „GitHub" v toolbaru nad seznamem souborů otevře modální dialog pro nastavení propojení s GitHub repozitářem (owner/repo nebo plná URL, volitelný access token pro soukromé repozitáře, výběr větve s možností načtení seznamu větví z API, vlastní exclude pravidla nad rámec .gitignore přes rozkliknutelnou stromovou strukturu repozitáře s checkboxy — načítá se tlačítkem „Load folders" z GitHub API, zobrazuje adresáře i soubory (adresáře řazeny první, soubory s barevnými ikonami dle přípony), stromová struktura má vizuální vodící čáry, názvy zachovávají originální velikost písmen z repozitáře, zaškrtnuté položky mají přeškrtnutý text, kliknutí na šipku rozbalí/sbalí adresář bez zaškrtnutí checkboxu, podporuje kaskádní zaškrtávání rodič/potomek a indeterminate stav). Modální dialog GitHub nastavení má tři tlačítka: Cancel, Save (uloží nastavení bez synchronizace) a Save & sync / Connect & sync (uloží a provede sync). Systém používá GitHub Trees API pro rekurzivní načtení struktury repozitáře, parsuje všechny .gitignore soubory v repozitáři a respektuje jejich pravidla, automaticky přeskakuje binární soubory (obrázky, fonty, archivy, spustitelné soubory atd.). Soubory se stahují přes raw.githubusercontent.com v dávkách po 10 pro optimální výkon. Nastavení GitHub propojení se ukládá do IndexedDB jako součást projektu (interface GitHubConfig: owner, repo, branch, token, customExcludes). Po připojení se ihned zobrazí stavový řádek pod toolbarem s názvem repozitáře, aktuální větví, tlačítkem synchronizace (aktualizuje načtené soubory), tlačítkem nastavení (otevře dialog s předvyplněnými hodnotami) a tlačítkem odpojení. Při synchronizaci se nahradí pouze soubory s `source: 'github'` novými z GitHubu — manuálně vložené soubory (`source: 'manual'`) a vlastní texty zůstávají na svých pozicích (včetně pořadí). Pokud by po synchronizaci pozice manuálních souborů přesahovaly celkový počet položek, automaticky se přepočítají (vloží se na konec). Průběh synchronizace zobrazuje modální okno s progress barem a informací o stavu. Přepnutí projektu aktualizuje zobrazení stavového řádku podle uloženého GitHub propojení daného projektu. Plná podpora i18n (EN/CS).
* Toolbar se seznamem souborů (view toggle, přidat text, GitHub) je vždy viditelný — i když projekt ještě nemá žádné soubory, toolbar je zobrazen nad dropzonou
* Vymazat vše (soubory i výstup) jedním tlačítkem — s potvrzovacím dialogem
* Zobrazovat metadata výstupu (počet souborů, řádků, velikost, odhadovaný počet tokenů pro LLM)
* Zobrazovat toast notifikace pro zpětnou vazbu uživateli (pozicované dole uprostřed, pill shape s border a backdrop blur) — úspěšné akce mají zelené accent pozadí a text, varovné/chybové mají neutrální styl
* Při aktualizaci již nahraného souboru zobrazit vizuální efekt — starý box se rozpadne na zelené částice (particle burst), které se rozletí do okolí, a nový box se nafoukne jako bublina (grow-in animace)
* Modalni okna pro akce
* Internacionalizace (i18n) — podpora více jazyků s přepínačem v horní liště, výchozí jazyk angličtina, dostupné jazyky: EN, CS. Překlad používá slovníkový systém s `t(key, params)` funkcí, statické HTML prvky mají `data-i18n` atributy, jazyková preference se ukládá do localStorage
* Přepínač světlého/tmavého režimu v horní liště — tlačítko s ikonami slunce (pro přepnutí na light) a měsíce (pro přepnutí na dark), preference se ukládá do localStorage, výchozí režim tmavý

## Design

* Tmavý (dark) a světlý (light) theme s propracovanou barevnou paletou — dark: černé pozadí (#09090b), povrchové úrovně (#131316, #1a1a1f, #222228), zelený accent (#22c55e); light: světlé pozadí (#f5f5f7), bílé povrchy (#ffffff), tmavší zelený accent (#16a34a)
* Typografie: Inter (UI text), JetBrains Mono (kód, metadata)
* SVG ikony v tlačítkách místo emoji — merge, download, copy, upload ikony
* Logo v top baru s gradientním zeleným pozadím a SVG git-merge ikonou
* Tlačítka s SVG ikonami uvnitř `<span data-i18n>` pro správnou funkci překladů
* Modální okna s backdrop blur efektem
* Jemné přechodové animace (150ms cubic-bezier)
* Dropzona s inset glow efektem při hoveru/dragoveru
* Soubory v seznamu s plynulým zobrazováním remove tlačítka na hover
* Scrollbary — tenké, custom stylované přes CSS

## Technický stack

* **Build**: Vite 8 (Rolldown) + TypeScript
* **Závislosti**: highlight.js (syntax highlighting), pdf-lib (PDF operace), pdfjs-dist (extrakce textu z PDF), GitHub REST API (fetch repozitářů, bez externích knihoven)
* **Struktura projektu**:
  - `index.html` — HTML šablona
  - `src/main.ts` — vstupní bod, inicializace
  - `src/styles/main.css` — všechny styly
  - `src/i18n.ts` — překlady a i18n funkce
  - `src/db.ts` — IndexedDB operace, typy
  - `src/state.ts` — sdílený stav aplikace
  - `src/dom.ts` — reference na DOM elementy
  - `src/helpers.ts` — utility funkce (escapeHtml, formatSize, getExtColor, getLanguage, cleanPath, readFile)
  - `src/toast.ts` — toast notifikace
  - `src/modal.ts` — modální dialogy
  - `src/animations.ts` — particle burst a grow-in animace
  - `src/projects.ts` — správa projektů (CRUD, persistence, přepínání)
  - `src/file-list.ts` — renderování seznamu souborů, drag & drop reorder
  - `src/dropzone.ts` — drag & drop nahrávání souborů
  - `src/merge.ts` — slučování, kopírování, stahování (text i PDF)
  - `src/github.ts` — GitHub API integrace (fetch repozitáře, .gitignore parsing, synchronizace)
  - `src/github-init.ts` — inicializace GitHub UI eventů (tlačítka, odpojení)
  - `src/lang-switcher.ts` — přepínač jazyků
  - `src/theme-toggle.ts` — přepínač světlého/tmavého režimu