Utilita pro slučování souborů. utilita umí:

* Spravovat projekty v pravém panelu — vytvářet, přepínat kliknutím, přejmenovávat a mazat projekty (inline tlačítka u každého projektu)
* Persistentně ukládat nahrané soubory do IndexedDB — soubory přežijí zavření prohlížeče
* Automaticky obnovit poslední aktivní projekt při spuštění aplikace
* Nahrávat soubory přetažením (drag & drop) — dropzona se zobrazí přes celou oblast hlavního obsahu (main-content) když projekt nemá žádné soubory, po přidání souborů se při přetahování zobrazí overlay přes celou viditelnou oblast main-content s fixní pozicí (neroste s obsahem)
* Zachytávat kompletní cesty souborů přes skrytý textarea při přetažení
* Řadit soubory přetažením v seznamu (drag & drop reorder)
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
* Slučování PDF souborů — automatická detekce PDF souborů v seznamu, tlačítko „Download PDF" se zobrazí jakmile je v seznamu alespoň jeden PDF soubor. Pokud jsou všechny soubory PDF, sloučí se do jednoho PDF. Pokud jsou v seznamu i textové soubory, jejich obsah se převede na PDF stránky (Courier, A4, automatické zalamování řádků) a vloží do výsledného PDF. PDF soubory se v textovém výstupu zobrazují jako placeholder `[PDF – binární obsah]`. Používá knihovnu pdf-lib.
* Vymazat vše (soubory i výstup) jedním tlačítkem — s potvrzovacím dialogem
* Zobrazovat metadata výstupu (počet souborů, řádků, velikost)
* Zobrazovat toast notifikace pro zpětnou vazbu uživateli (pozicované dole uprostřed) — úspěšné akce mají zelené pozadí s bílým textem a checkmarkem, varovné/chybové zůstávají žluté
* Při aktualizaci již nahraného souboru zobrazit vizuální efekt — starý box se rozpadne na zelené částice (particle burst), které se rozletí do okolí, a nový box se nafoukne jako bublina (grow-in animace)
* Modalni okna pro akce
* Internacionalizace (i18n) — podpora více jazyků s přepínačem v horní liště, výchozí jazyk angličtina, dostupné jazyky: EN, CS. Překlad používá slovníkový systém s `t(key, params)` funkcí, statické HTML prvky mají `data-i18n` atributy, jazyková preference se ukládá do localStorage

## Technický stack

* **Build**: Vite 8 (Rolldown) + TypeScript
* **Závislosti**: highlight.js (syntax highlighting), pdf-lib (PDF operace)
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
  - `src/lang-switcher.ts` — přepínač jazyků