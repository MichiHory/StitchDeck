Utilita pro slučování souborů pro LLM. utilita umí:

## Správa projektů

* Spravovat projekty v levém panelu
  - Vytvářet nové projekty přes modální dialog
  - Přepínat mezi projekty kliknutím na název
  - Přejmenovávat projekty inline (ikona tužky při hoveru)
  - Mazat projekty s potvrzovacím dialogem (ikona ✕ při hoveru) — lze smazat i poslední projekt
  - Projekty řazeny abecedně dle locale
* Pokud nejsou žádné projekty, hlavní obsah zobrazí placeholder s tlačítkem „Nový projekt" na středu obrazovky
* Persistentně ukládat data do IndexedDB — soubory přežijí zavření prohlížeče
* Automaticky obnovit poslední aktivní projekt při spuštění aplikace (uloženo v localStorage)
* Při prvním spuštění (bez projektů) zobrazí placeholder s výzvou k vytvoření projektu

## Export a import projektů

* Export projektů do komprimovaného souboru (.sdeck formát)
  - Modální dialog pro výběr projektů k exportu (všechny nebo jen některé)
  - Checkbox "Vybrat vše" s indeterminate stavem
  - Volitelné heslo pro šifrování souboru (AES-256-GCM s PBKDF2 derivací klíče)
  - Bez hesla se soubor pouze komprimuje (gzip), s heslem se navíc šifruje
  - Stažení souboru jako `stitchdeck-export.sdeck`
* Import projektů ze .sdeck souboru
  - Automatická detekce šifrovaného souboru — výzva k zadání hesla
  - Detekce duplicitních názvů projektů s dialogem pro volbu akce:
    - Přepsat existující projekt
    - Přejmenovat importovaný projekt (předvyplněný název s suffixem "(importováno)", uživatel může manuálně upravit)
    - Vytvořit projekt s duplicitním názvem
    - Přeskočit
  - Chybové hlášky zobrazeny jako stacked toast notifikace (více chyb viditelných najednou)
* Tlačítka Export/Import v hlavičce postranního panelu (sidebar) vedle tlačítka pro nový projekt — kompaktní ikonová tlačítka
* Binární formát .sdeck: magic bytes "SDCK" + verze + příznak šifrování + [salt + iv + šifrovaná data] nebo [komprimovaná data]
* Používá nativní Web Crypto API (PBKDF2, AES-GCM) a CompressionStream/DecompressionStream — žádné externí závislosti
* Plná podpora i18n (EN/CS)

## Nahrávání souborů

* Nahrávat soubory přetažením (drag & drop)
  - Dropzona se zobrazí přes celou oblast hlavního obsahu (main-content) když projekt nemá žádné soubory
  - Po přidání souborů se při přetahování zobrazí overlay přes celou viditelnou oblast main-content s fixní pozicí (neroste s obsahem)
  - Dropzona má dashed border a inset glow efekt při hoveru/dragoveru
* Zachytávat kompletní cesty souborů přes skrytý textarea při přetažení
  - Používá `webkitRelativePath` pro zachování adresářové struktury
  - Fallback na samotný název souboru pokud relativní cesta není dostupná
  - Čistí cesty odstraněním `file://` prefixu a dekódováním URI komponent

## Seznam souborů

* Přepínač zobrazení seznamu souborů — režim seznam (list), dlaždice (tiles) a strom (tree) s přepínačem v toolbaru nad seznamem
  - **Seznam (list)**: zobrazuje pořadové číslo, drag handle (⋮), ikonu souboru s barevným badge přípony, název souboru, cestu, metadata (velikost, počet řádků) a remove tlačítko
  - **Dlaždice (tiles)**: grid layout (auto-fill, min 170px), kompaktně zobrazuje ikonu, název souboru (zkrácený pokud se nevejde), zkrácenou cestu (direction: rtl — zobrazuje konec cesty), velikost a indikátor řádků/PDF
  - **Strom (tree)**: hierarchické zobrazení souborů seskupených podle adresářové struktury s rozbalovacími/sbalovacími složkami; složky řazeny abecedně před soubory; soubory zobrazují pořadové číslo, ikonu, název, metadata a remove tlačítko; stav sbalení/rozbalení složek přetrvává mezi překreslením; vlastní texty (custom text) zobrazeny na kořenové úrovni; drag & drop reorder funguje na jednotlivých souborech; kliknutím na pořadové číslo se zobrazí inline input pro manuální nastavení pozice (Enter potvrdí, Escape zruší, blur potvrdí)
  - Ve všech režimech funguje číslování pořadí a drag & drop reorder
  - Výchozí režim zobrazení je dlaždice (tiles)
  - Preference režimu se ukládá do localStorage
* Tooltip systém v režimu dlaždic
  - Celá cesta se zobrazí jako tooltip při hoveru po 1 sekundě
  - Tooltip se inteligentně repositionuje aby nepřesáhl viewport
  - Tooltip se potlačí během přetahování
* Barevně odlišit typ souboru v seznamu podle přípony
  - HTML/XML/Latte: červené/oranžové tóny
  - JavaScript/TypeScript: žluté/modré tóny
  - PHP: fialová
  - JSON/YAML: šedé/červené tóny
  - CSS/SCSS/LESS: modré tóny
  - Fallback: zelená
* Řadit soubory přetažením v seznamu (drag & drop reorder)
  - Přetahovaný soubor má sníženou průhlednost (35%) a scale 98%
  - Cíl přetažení se zvýrazní accent barvou
  - Po přeřazení se automaticky uloží do IndexedDB
* Odebírat jednotlivé soubory tlačítkem ✕ (zobrazí se plynule při hoveru)
* Lazy loading obsahu souborů
  - Soubory se při nahrání nečtou ihned do textu
  - Pole `content` je null, File objekt uložen v `_file`
  - Při persistenci projektu se nepřečtené soubory konvertují na text

## Vlastní texty (custom text)

* Vkládat vlastní textové záznamy mezi soubory pomocí fialového tlačítka „Přidat text" v toolbaru
* Modální dialog pro vytváření a editaci vlastních textů
  - Nadpis (povinný, s validací a chybovou hláškou při prázdném)
  - Pozice (číslo 1–N, default 1 pro nový, aktuální pozice pro editaci)
  - Textarea pro obsah (volitelný)
  - Přepínač „Vložit nadpis do exportu" (defaultně zapnutý)
* Zobrazení ve výpisu vedle souborů s fialovým barevným odlišením (border, ikona, nadpis)
  - V režimu seznam: zobrazují nadpis místo názvu souboru a náhled obsahu místo cesty
  - V režimu dlaždice: stejný layout s fialovou ikonou tužky
* Editace kliknutím na fialovou ikonu tužky (při hoveru se zvýrazní a zvětší) nebo dvojklikem na celou dlaždici
* Při sloučení se chovají jako .md soubory (plaintext, bez syntax highlightingu)
* Nadpisy vlastních textů jsou ve výstupu zvýrazněny fialově (#a78bfa)
* Podporují drag & drop řazení spolu s ostatními soubory
* Persistentně se ukládají do IndexedDB jako součást projektu

## Slučování a výstup

* Sloučit všechny soubory do jednoho textového výstupu ve formátu `cesta:\nobsah`
* Přepínače pro ovládání výstupu (s persistencí do localStorage)
  - Zapnutí/vypnutí vkládání cesty k souboru (defaultně vypnutý)
  - Oříznutí prázdných řádků na začátku a konci obsahu každého souboru (defaultně vypnutý)
  - LLM-optimalizovaný formát (defaultně zapnutý) — přidá `<file_map>` s číslovaným seznamem souborů na začátek a obalí obsah každého souboru do `<file path="...">...</file>` XML tagů (inspirováno Repomix formátem, optimální pro Claude, GPT i Gemini)
  - Přepínače „Include file paths" a „LLM-optimized format" se vzájemně vylučují — zapnutí jednoho automaticky vypne druhý; při inicializaci má přednost LLM formát
  - Komprese exportu pro LLM (defaultně vypnutý) — odstraní komentáře (řádkové i blokové pro C-style, hash, HTML a SQL jazyky), zkolabuje po sobě jdoucí prázdné řádky, zredukuje odsazení (4 mezery→2, taby→2 mezery, kromě Pythonu), ořízne trailing whitespace; markdown a plaintext se pouze kolabují prázdné řádky (komentáře jsou obsah)
  - Bezpečnostní sken před sloučením (defaultně zapnutý) — před sloučením prohledá obsah souborů a detekuje potenciální tajné klíče, tokeny, hesla, privátní klíče, connection stringy a další citlivé údaje; při nálezu zobrazí modální varování s tabulkou nálezů (soubor, řádek, typ, detail, maskovaná shoda) a checkboxem u každého nálezu pro volbu nahrazení; zaškrtnuté secrety se ve výstupu nahradí náhodným řetězcem, nezaškrtnuté zůstanou; checkbox „vybrat vše" v záhlaví; zdrojové soubory se nemění — nahrazení se aplikuje pouze na output; uživatel může sloučení také zrušit
  - Převod PDF dokumentů na text — zobrazí se jen pokud je v seznamu alespoň jeden PDF soubor (defaultně zapnutý)
* Zobrazení sloučeného výstupu
  - Číslování řádků (čísla nejsou součástí textu — nejdou kopírovat, nejsou v selekci)
  - Omezení na 20 000 řádků s upozorněním na zkrácení
  - Syntax highlighting podle typu souboru
* Syntax highlighting
  - Podporované jazyky: HTML/HTM, XML/SVG, JS/MJS/CJS, TS, TSX/JSX, PHP, JSON, YAML/YML, NEON, Latte, Blade, Vue, Svelte, CSS/SCSS/LESS, Python, Ruby, Java, C, C++, C#, Go, Rust, Swift, Kotlin, Scala, Perl, R, Bash/Shell/Zsh, SQL, Lua, Dart, Haskell, Objective-C, Groovy/Gradle, PowerShell, Dockerfile, INI/TOML/conf, Markdown
  - Jazyk se detekuje z přípony v hlavičce každé sekce
  - Názvy souborů zvýrazněny neonově zeleně (#27db0f)
  - Highlighting je čistě vizuální — není součástí kopírovaného ani staženého textu
  - Používá knihovnu highlight.js
* Metadata výstupu — zobrazuje počet souborů, řádků, velikost a odhadovaný počet tokenů pro LLM (knihovna tokenx)

## Kopírování a stahování

* Zkopírovat sloučený obsah do schránky (bez čísel řádků a bez syntax highlightingu)
  - Používá nativní Clipboard API (`navigator.clipboard.writeText`)
  - Pokud kopírování selže, zobrazí se upozornění
* Stáhnout sloučený obsah jako textový soubor
  - Modální dialog pro volbu názvu souboru a formátu
  - Podporované formáty: txt, md, json, xml, csv, html, log
  - Výchozí název `merged-files`, výchozí formát `.txt`
  - MIME typy nastaveny odpovídajícím způsobem
* Stáhnout jako PDF (tlačítko „Download PDF" se zobrazí pokud je v seznamu alespoň jeden PDF soubor)
  - Pokud jsou všechny soubory PDF, sloučí se do jednoho PDF (kopíruje všechny stránky)
  - Pokud jsou v seznamu i textové soubory, obsah se převede na PDF stránky (Courier, A4, automatické zalamování řádků, auto-paginace)
  - Nepodporované znaky se nahradí otazníkem
  - Používá knihovnu pdf-lib

## PDF zpracování

* Automatická detekce PDF souborů v seznamu (dle přípony `.pdf`)
* Binární data uložena jako base64 string v poli `pdfData`
* Extrakce textu z PDF (pomocí pdfjs-dist)
  - Řadí textové prvky podle vizuální pozice (Y shora dolů, X zleva doprava)
  - Seskupuje prvky do řádků na základě výšky fontu
  - Vkládá mezery/tabulátory podle horizontálních vzdáleností mezi prvky
  - Vícestránkové dokumenty spojeny s prázdnými řádky mezi stránkami
* Když je přepínač „Převést PDF na text" vypnutý, zobrazí se placeholder `[PDF – binární obsah]`

## GitHub integrace

* Tlačítko „GitHub" v toolbaru otevře modální dialog pro nastavení propojení
* Nastavení propojení
  - Repository: owner/repo nebo plná URL (automaticky stripuje `.git` suffix)
  - Volitelný access token pro soukromé repozitáře
  - Výběr větve s možností načtení seznamu větví z API (zobrazí se jako klikatelné chipy)
* Exclude pravidla přes stromovou strukturu repozitáře
  - Načítá se tlačítkem „Load folders" z GitHub API (Trees API s recursive=1)
  - Zobrazuje adresáře i soubory (adresáře řazeny první, soubory s barevnými ikonami dle přípony)
  - Stromová struktura má vizuální vodící čáry
  - Názvy zachovávají originální velikost písmen z repozitáře
  - Zaškrtnuté položky mají přeškrtnutý text
  - Kliknutí na šipku rozbalí/sbalí adresář bez zaškrtnutí checkboxu
  - Kaskádní zaškrtávání rodič/potomek a indeterminate stav
* .gitignore podpora
  - Parsuje všechny .gitignore soubory v repozitáři a respektuje jejich pravidla
  - Podporuje `**`, `*`, `?`, `/` anchoring, directory-only patterny (trailing `/`), negaci (`!`), character classes (`[abc]`), escaped znaky (`\#`, `\!`, `\ `), automatický anchoring patternů obsahujících `/`
  - Custom excludes se aplikují nad rámec .gitignore pravidel
* Automatické přeskakování binárních souborů (obrázky, fonty, archivy, spustitelné soubory atd.)
* Modální dialog má tři tlačítka: Cancel, Save (uloží bez synchronizace), Save & sync / Connect & sync (uloží a provede sync)
* Stavový řádek po připojení
  - Zobrazí se pod toolbarem s GitHub logem, názvem repozitáře a aktuální větví
  - Tlačítka: synchronizace (aktualizuje soubory), nastavení (otevře dialog s předvyplněnými hodnotami), odpojení
  - Při přepnutí projektu se aktualizuje podle uloženého GitHub propojení daného projektu
* Synchronizace
  - Soubory se stahují přes raw.githubusercontent.com v dávkách po 10 pro optimální výkon
  - Nahradí pouze soubory s `source: 'github'` novými z GitHubu
  - Manuálně vložené soubory (`source: 'manual'`) a vlastní texty zůstávají na svých pozicích včetně pořadí
  - Pokud by po synchronizaci pozice manuálních souborů přesahovaly celkový počet položek, automaticky se přepočítají
  - Průběh synchronizace zobrazuje modální okno s progress barem a informací o stavu
* Nastavení GitHub propojení se ukládá do IndexedDB jako součást projektu (interface GitHubConfig: owner, repo, branch, token, customExcludes)
* Plná podpora i18n (EN/CS)

## Toolbar a akce

* Toolbar se seznamem souborů (view toggle, přidat text, GitHub) je vždy viditelný — i když projekt ještě nemá žádné soubory
* Vymazat vše (soubory i výstup) jedním tlačítkem — s potvrzovacím dialogem

## Notifikace a modální okna

* Toast notifikace pro zpětnou vazbu uživateli
  - Pozicované dole uprostřed v kontejneru, pill shape s border a backdrop blur
  - Podpora více toast notifikací zobrazených současně (stacking) — nové se zobrazují nad předchozími
  - Úspěšné akce: zelené accent pozadí a text, prefix ✓
  - Chybové akce: červené accent pozadí a text
  - Varovné: neutrální styl
  - Auto-dismiss po 3.5 sekundě (každý toast nezávisle)
* Modální okna pro akce
  - Backdrop blur efekt
  - Zavření kliknutím na pozadí nebo klávesou ESC
  - Enter v input poli potvrdí akci
  - Podpora validace a zobrazení chyb
  - Varianta `modal--large` pro GitHub a custom text dialogy

## Animace

* Při aktualizaci již nahraného souboru vizuální efekt
  - Starý box se rozpadne na 18 zelených částic (particle burst) různých odstínů, které se rozletí do okolí s rotací (trvání 350–600ms)
  - Nový box se nafoukne jako bublina (grow-in animace): start na 30% scale → 102% → 100%, trvání 450ms s cubic-bezier easing
* Jemné přechodové animace celkově 150ms cubic-bezier(.4,0,.2,1)

## Internacionalizace (i18n)

* Podpora více jazyků s přepínačem v horní liště
  - Výchozí jazyk angličtina, dostupné jazyky: EN, CS
  - Přepínač tlačítky v pravém horním rohu, aktivní jazyk zvýrazněn accent barvou
* Překlad používá slovníkový systém s `t(key, params)` funkcí
  - Statické HTML prvky mají `data-i18n` atributy, title atributy `data-i18n-title`
  - Parametrická substituce `{paramName}` v překladech
  - Fallback na angličtinu pokud překlad chybí
* Jazyková preference se ukládá do localStorage
* Při změně jazyka se automaticky překreslí veškeré UI texty

## Nápověda

* Tlačítko nápovědy v patičce panelu projektů (sidebar) s ikonou otazníku
* Kliknutí otevře stránku s dokumentací, která nahradí hlavní obsah
* Přímý odkaz na nápovědu přes `#help` v URL — umožňuje sdílení odkazu a přímý přístup bez proklikávání aplikací
  - Při otevření nápovědy se URL aktualizuje na `#help` (přes `history.pushState`)
  - Při zavření nápovědy se hash odstraní
  - Při načtení stránky s `#help` v URL se nápověda automaticky zobrazí
  - Navigace zpět/vpřed v prohlížeči správně přepíná mezi nápovědou a aplikací
* Dokumentace uložena v samostatných .md souborech pro každý jazyk (`src/docs/en.md`, `src/docs/cs.md`) — snadné přidání dalších jazyků
* Jednoduchý markdown parser převádí .md na HTML (h1–h3, odstavce, seznamy, bold, inline code)
* Dokumentace obsahuje sekce: Začínáme, Projekty, Přidávání souborů, Seznam souborů, Vlastní texty, Slučování a export, GitHub integrace, Tipy a klávesy
* Postranní navigace je vždy viditelná (fixní panel vlevo vedle scrollovatelného obsahu)
* Aktivní sekce se zvýrazní v navigaci při scrollování
* Tlačítko „Zpět do aplikace" pro návrat do hlavního zobrazení
* Responsivní — na mobilu se navigace zobrazí nad obsahem

## Světlý/tmavý režim

* Přepínač v horní liště — tlačítko s ikonami slunce (pro přepnutí na light) a měsíce (pro přepnutí na dark)
* Preference se ukládá do localStorage, výchozí režim tmavý
* Přepnutí aplikuje třídu `light` na `<html>` element s přepsáním CSS proměnných

## Design

* Tmavý (dark) a světlý (light) theme s propracovanou barevnou paletou
  - Dark: černé pozadí (#09090b), povrchové úrovně (#131316, #1a1a1f, #222228), zelený accent (#22c55e)
  - Light: světlé pozadí (#f5f5f7), bílé povrchy (#ffffff), tmavší zelený accent (#16a34a)
* Layout: flexbox, top bar + sidebar (260px, fixní výška viewportu, nescrolluje se s obsahem) + main content
* Typografie: Inter (UI text), JetBrains Mono (kód, metadata)
* SVG ikony v tlačítkách místo emoji — merge, download, copy, upload ikony
* Logo v top baru s gradientním zeleným pozadím a stylizovaným písmenem S
* Tlačítka s SVG ikonami uvnitř `<span data-i18n>` pro správnou funkci překladů
* Scrollbary — sjednocené globálně přes CSS proměnné `--scroll-thumb`/`--scroll-thumb-hover`, dobře viditelné v obou režimech (dark i light)
* Soubory v seznamu s plynulým zobrazováním remove tlačítka na hover

## SEO optimalizace

* Meta tagy: description, keywords, author, robots, theme-color
* Open Graph tagy (og:type, og:title, og:description, og:site_name, og:locale s alternativou cs_CZ)
* Twitter Card tagy (summary card s title a description)
* Structured Data (JSON-LD) — schema.org WebApplication s featureList a cenou (zdarma)
* `<noscript>` blok s plným textovým popisem aplikace a funkcí pro vyhledávače, které neexekuují JS
* Dynamický `lang` atribut na `<html>` — nastavuje se při inicializaci a při přepnutí jazyka
* `robots.txt` v `public/` povolující indexaci
* Optimalizovaný `<title>` s klíčovými slovy (StitchDeck — Merge Files for LLM | AI-Optimized File Merger)

## Technický stack

* **Build**: Vite 8 (Rolldown) + TypeScript (strict mode, ES2020 target)
* **Závislosti**: highlight.js (syntax highlighting), pdf-lib (PDF operace), pdfjs-dist (extrakce textu z PDF), tokenx (počítání tokenů), GitHub REST API (fetch repozitářů, bez externích knihoven)
* **Struktura projektu**:
  - `index.html` — HTML šablona
  - `src/main.ts` — vstupní bod, inicializace všech systémů
  - `src/styles/main.css` — všechny styly
  - `src/i18n.ts` — překlady a i18n funkce
  - `src/db.ts` — IndexedDB operace, typy (FileEntry, Project, GitHubConfig)
  - `src/state.ts` — sdílený stav aplikace (files, fullMergedContent, dragSrcIndex, renderGeneration, currentProjectId, saveTimeout, viewMode)
  - `src/dom.ts` — reference na DOM elementy
  - `src/helpers.ts` — utility funkce (escapeHtml, formatSize, countTokens, formatTokens, cleanPath, readFile, getExtColor, getLanguage)
  - `src/toast.ts` — toast notifikace
  - `src/modal.ts` — modální dialogy (generický komponent s validací)
  - `src/animations.ts` — particle burst a grow-in animace
  - `src/projects.ts` — správa projektů (CRUD, persistence, přepínání)
  - `src/export-import.ts` — export a import projektů (komprese, šifrování, UI dialogy, řešení duplicit)
  - `src/file-list.ts` — renderování seznamu souborů, drag & drop reorder, custom text dialogy
  - `src/dropzone.ts` — drag & drop nahrávání souborů
  - `src/merge.ts` — slučování, kopírování, stahování (text i PDF), clear all
  - `src/pdf.ts` — PDF binární konverze utility
  - `src/github.ts` — GitHub API integrace (fetch repozitáře, .gitignore parsing, synchronizace, stromová struktura)
  - `src/github-init.ts` — inicializace GitHub UI eventů (tlačítka, odpojení)
  - `src/lang-switcher.ts` — přepínač jazyků
  - `src/theme-toggle.ts` — přepínač světlého/tmavého režimu
  - `src/help.ts` — stránka nápovědy s markdown parserem a navigací
  - `src/docs/en.md` — dokumentace v angličtině
  - `src/docs/cs.md` — dokumentace v češtině
  - `public/robots.txt` — robots.txt pro vyhledávače

## Persistence

* **IndexedDB** (databáze `stitchdeck`, verze 1, object store `projects`)
  - Ukládá projekty se soubory a GitHub konfigurací
  - Operace: getAllProjects, getProject, saveProject, deleteProjectFromDB
* **localStorage** klíče:
  - `stitchdeck_viewMode` — režim zobrazení (list/tiles/tree)
  - `stitchdeck_togglePaths` — vkládání cest do výstupu
  - `stitchdeck_toggleTrimEmpty` — ořezávání prázdných řádků
  - `stitchdeck_togglePdfToText` — extrakce textu z PDF
  - `stitchdeck_toggleCompress` — komprese exportu pro LLM
  - `stitchdeck_toggleSecurityScan` — bezpečnostní sken před sloučením
  - `stitchdeck_toggleFileMap` — vložení mapy souborů na začátek
  - `stitchdeck_lang` — jazyk (en/cs)
  - `stitchdeck_theme` — téma (dark/light)
  - `stitchdeck_activeProject` — ID posledního aktivního projektu