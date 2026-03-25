# Dokumentace StitchDeck
Kompletní průvodce aplikací StitchDeck — utilita pro slučování souborů pro LLM.

## Začínáme

StitchDeck je webová utilita pro slučování více zdrojových souborů do jednoho textového výstupu, optimalizovaného pro použití s velkými jazykovými modely (LLM) jako ChatGPT, Claude nebo Gemini. Celá aplikace běží lokálně ve vašem prohlížeči — žádná data se neodesílají na server. Vaše soubory nikdy neopustí váš počítač.

### Rychlý start

- Vytvořte nebo vyberte projekt v levém panelu
- Přetáhněte soubory do hlavní oblasti
- Volitelně přidejte vlastní texty s instrukcemi pro AI
- Přeuspořádejte soubory přetažením v požadovaném pořadí
- Klikněte na **Sloučit soubory** pro vytvoření výstupu
- Zkopírujte výstup do schránky nebo ho stáhněte jako soubor

Všechna data jsou uložena lokálně v IndexedDB vašeho prohlížeče a přetrvávají i po zavření karty. Můžete bezpečně zavřít prohlížeč a vrátit se k práci později — vše bude přesně tak, jak jste to zanechali.

### K čemu to je?

Při práci s AI modely často potřebujete sdílet více zdrojových souborů jako kontext. Kopírovat je jeden po druhém je zdlouhavé a náchylné k chybám. StitchDeck sloučí všechny soubory do jednoho dobře strukturovaného textu, který AI modely dokážou efektivně zpracovat. LLM-optimalizovaný formát obsahuje mapu souborů a XML tagy, které modelu pomáhají pochopit strukturu vašeho kódu.

## Projekty

StitchDeck organizuje vaši práci do projektů. Každý projekt má vlastní sadu souborů, vlastních textů a GitHub konfiguraci. To vám umožňuje udržovat oddělené kontexty pro různé úkoly nebo repozitáře.

### Vytvoření projektu

Klikněte na tlačítko **+** v záhlaví panelu projektů. Zobrazí se dialog, kde zadáte název projektu. Potvrďte klávesou **Enter** nebo tlačítkem **Vytvořit**.

### Přepínání projektů

Klikněte na název projektu v seznamu. Aktuální projekt se před přepnutím automaticky uloží, takže nikdy nepřijdete o svou práci. Poslední aktivní projekt se zapamatuje a obnoví při dalším otevření aplikace.

### Přejmenování a mazání

- Najeďte myší na projekt — zobrazí se ikony pro přejmenování (tužka) a smazání (křížek)
- Klikněte na ikonu tužky pro otevření dialogu s předvyplněným aktuálním názvem
- Klikněte na ikonu křížku pro smazání — zobrazí se potvrzovací dialog
- Lze smazat všechny projekty včetně posledního — pokud žádné projekty neexistují, hlavní oblast zobrazí tlačítko **Nový projekt** uprostřed

Projekty jsou řazeny abecedně podle nastavení jazyka.

### Export a import

Projekty můžete exportovat do komprimovaného souboru `.sdeck` a zpětně je importovat — hodí se pro zálohy, přenos mezi prohlížeči nebo sdílení s kolegy.

**Export:**

- Klikněte na ikonové tlačítko **export** v záhlaví panelu projektů (šipka nahoru, vedle tlačítka +)
- Zobrazí se dialog s checkboxy pro všechny projekty — vyberte, které exportovat, nebo použijte **Vybrat vše**
- Volitelně nastavte **heslo** pro šifrování souboru (minimálně 6 znaků) — soubor se zašifruje pomocí AES-256-GCM s derivací klíče PBKDF2 (600 000 iterací). Bez hesla se soubor pouze zkomprimuje.
- Klikněte na **Exportovat** pro stažení souboru `.sdeck`

**Import:**

- Klikněte na ikonové tlačítko **import** v záhlaví panelu projektů (šipka dolů)
- Vyberte soubor `.sdeck` — pokud je chráněn heslem, budete vyzváni k jeho zadání
- Pokud názvy importovaných projektů již existují, zobrazí se dialog pro každý duplicitní projekt s možnostmi:
  - **Přejmenovat** — zobrazí se textový vstup s navrženým názvem (např. „Můj projekt (importováno)"), který můžete libovolně upravit
  - **Přepsat** — nahradí existující projekt
  - **Vytvořit duplicitu** — importuje se stejným názvem vedle existujícího projektu
  - **Přeskočit** — tento projekt neimportovat
- Chyby při importu se zobrazí jako vrstvené toast notifikace, aby byly všechny hlášky vidět najednou

## Přidávání souborů

Soubory do projektu přidáte přetažením (drag & drop) na hlavní obsahovou oblast.

### Drag & drop

- Přetáhněte soubory nebo složky z průzkumníka souborů do oblasti hlavního obsahu
- Pokud je projekt prázdný, zobrazí se velká dropzona s ikonou nahrávání — soubory pusťte kamkoli uvnitř ní
- Pokud projekt už obsahuje soubory, při začátku přetahování se přes obsahovou oblast zobrazí poloprůhledný overlay

### Cesty souborů

StitchDeck zachycuje úplné cesty souborů včetně adresářové struktury pomocí `webkitRelativePath`. To znamená, že při přetažení složky se zachovají relativní cesty uvnitř ní. Pokud relativní cesta není dostupná (např. při přetažení jednotlivých souborů), použije se pouze název souboru.

### Aktualizace souborů

Pokud přetáhnete soubor se stejným názvem a cestou jako existující, bude aktualizován na místě. Uvidíte vizuální efekt — starý soubor se „rozpadne" na částice a nový se objeví s animací zvětšení. To je užitečné, když jste v souboru provedli změny a chcete ho v projektu aktualizovat.

### Lazy loading

Obsahy souborů se při přidání nečtou ihned. Skutečný obsah se načte až když je potřeba (např. při sloučení nebo ukládání do IndexedDB). Díky tomu zůstává rozhraní responzivní i při přidání mnoha velkých souborů.

## Seznam souborů

Seznam souborů zobrazuje všechny soubory v aktuálním projektu. Mezi třemi režimy zobrazení přepínáte pomocí tlačítek v toolbaru nad seznamem.

### Režimy zobrazení

- **Seznam** — kompaktní zobrazení s pořadovým číslem, uchopovacím prvkem pro přetažení, ikonou souboru s barevným badge přípony, názvem souboru, cestou, metadaty (velikost, počet řádků) a tlačítkem pro odebrání
- **Dlaždice** — gridový layout se sloupci s automatickým vyplněním (minimálně 170px šířka), zobrazující ikonu, zkrácený název souboru, zkrácenou cestu (zprava doleva, aby byl vidět konec cesty), velikost a indikátor řádků/PDF
- **Strom** — hierarchické zobrazení seskupené podle adresářové struktury s rozbalovacími složkami; složky řazeny abecedně před soubory; soubory zobrazují pořadové číslo, ikonu, název, metadata a tlačítko pro odebrání

Preference režimu zobrazení se automaticky ukládá a obnovuje.

### Řazení přetažením

Ve všech režimech můžete měnit pořadí souborů přetažením. Uchopte uchopovací prvek (v režimu seznam) nebo celou dlaždici/řádek a pusťte na požadované místo. Cíl přetažení se zvýrazní accent barvou. Pořadí určuje, v jakém sledu budou soubory ve sloučeném výstupu, takže je seřaďte v pořadí, které dává AI největší smysl.

### Změna pořadí číslem

V režimu seznam a strom klikněte na pořadové číslo souboru pro otevření inline vstupu, kde můžete přímo zadat novou pozici. Potvrďte klávesou **Enter** nebo kliknutím mimo, zrušte klávesou **Escape**.

### Barevné rozlišení

Soubory mají barevné ikony podle přípony pro rychlou identifikaci typů:

- **Červená/oranžová** — HTML, XML, Latte, Blade
- **Žlutá/modrá** — JavaScript, TypeScript, JSX, TSX
- **Fialová** — PHP
- **Šedá/červená** — JSON, YAML, NEON
- **Modrá** — CSS, SCSS, LESS
- **Zelená** — fallback pro ostatní typy

### Odebírání souborů

Najeďte myší na soubor — zobrazí se tlačítko pro odebrání (ikona křížku). Kliknutím soubor odeberete z projektu. Bez potvrzení — odebrání je okamžité, ale soubor můžete kdykoli přidat znovu přetažením.

### Tooltip v režimu dlaždic

V režimu dlaždic najeďte na soubor a podržte 1 sekundu — zobrazí se tooltip s úplnou cestou. Tooltip se automaticky přepozicuje, aby nepřesáhl okraj viewportu.

## Vlastní texty

Vlastní texty umožňují vkládat vlastní poznámky, instrukce nebo kontext mezi soubory ve sloučeném výstupu. To je obzvláště užitečné pro přidání AI promptů, vysvětlení nebo strukturování výstupu do logických sekcí.

### Vytvoření vlastního textu

- Klikněte na tlačítko **Přidat text** (fialové) v toolbaru
- Zadejte **nadpis** (povinný) — slouží jako záhlaví ve výstupu
- Volitelně napište **obsah** do textového pole
- Nastavte **pozici**, kde se má text zobrazit mezi soubory (výchozí je pozice 1, tedy na začátku)
- Přepínačem **Vložit nadpis do exportu** ovládejte, zda se nadpis objeví jako záhlaví ve sloučeném výstupu (ve výchozím stavu zapnuto)

### Editace

Klikněte na fialovou ikonu tužky u záznamu vlastního textu, nebo dvojklikem na celou dlaždici/řádek otevřete editační dialog. Dialog je předvyplněn aktuálními hodnotami.

### Zobrazení ve výstupu

Vlastní texty se ve sloučeném výstupu chovají jako .md soubory. Jejich nadpisy jsou ve výstupním zobrazení zvýrazněny fialově. Podporují řazení přetažením společně s běžnými soubory, takže je můžete umístit přesně tam, kde je potřebujete.

## Slučování a export

StitchDeck sloučí všechny soubory a vlastní texty do jednoho výstupu, který můžete zkopírovat nebo stáhnout. Klikněte na tlačítko **Sloučit soubory** pro vygenerování výstupu.

### Možnosti sloučení

Všechny volby se ukládají jako preference a obnoví se při další návštěvě:

- **Vkládat cesty k souborům** — přidá cestu souboru jako textové záhlaví každé sekce. Vzájemně se vylučuje s LLM formátem.
- **Oříznutí prázdných řádků** — odstraní prázdné řádky na začátku a konci obsahu každého souboru pro čistší výstup
- **LLM formát** — přidá `<file_map>` s číslovaným seznamem všech souborů na začátek a obalí obsah každého souboru do `<file path="...">...</file>` XML tagů. Formát je inspirován Repomixem a je optimální pro Claude, GPT i Gemini. Vzájemně se vylučuje s prostými cestami.
- **Komprese exportu** — snižuje počet tokenů odstraněním komentářů (řádkové i blokové pro C-style, hash, HTML a SQL jazyky), zkolabováním po sobě jdoucích prázdných řádků, redukcí odsazení (4 mezery na 2, taby na 2 mezery — kromě Pythonu) a oříznutím trailing whitespace. U markdown a plaintext souborů se pouze kolabují prázdné řádky (komentáře jsou obsah).
- **Bezpečnostní sken** — před sloučením prohledá obsah všech souborů na potenciální tajné klíče: API klíče, tokeny, hesla, privátní klíče, connection stringy a další citlivé údaje. Při nálezu zobrazí varovný dialog s tabulkou nálezů, kde u každého záznamu je checkbox. Můžete zvolit, které secrety se ve výstupu nahradí náhodným řetězcem — zaškrtnuté se nahradí, nezaškrtnuté zůstanou beze změny. Checkbox „vybrat vše" v záhlaví tabulky umožňuje rychle přepnout všechny nálezy. Zdrojové soubory se nikdy nemění — nahrazení se aplikuje pouze na sloučený výstup. Operaci můžete také zrušit.
- **Převod PDF na text** — zobrazí se jen pokud seznam obsahuje alespoň jeden PDF soubor. Extrahuje text z PDF stránek řazený podle vizuální pozice. Při vypnutí se místo obsahu PDF zobrazí placeholder `[PDF – binární obsah]`.

### Výstup

- Čísla řádků se zobrazují na levé straně — jsou čistě vizuální a nejsou součástí kopírovaného ani staženého textu
- Syntax highlighting je aplikován podle přípony souboru, podporuje 30+ jazyků včetně HTML, JavaScript, TypeScript, PHP, Python, Go, Rust a mnoha dalších
- Zobrazení je omezeno na 20 000 řádků. Pokud výstup tento limit překročí, zobrazí se varování a pro kompletní obsah je třeba soubor stáhnout
- Metadata pod záhlavím zobrazují počet souborů, řádků, velikost a odhadovaný počet tokenů (pomocí knihovny tokenx)

### Kopírování a stahování

- **Kopírovat** — zkopíruje čistý text bez čísel řádků a bez syntax highlightingu do schránky pomocí nativního Clipboard API
- **Stáhnout** — otevře dialog, kde zvolíte název souboru a formát (txt, md, json, xml, csv, html, log). MIME typy jsou nastaveny správně pro každý formát.
- **Stáhnout PDF** — zobrazí se jen pokud seznam obsahuje PDF soubory. Pokud jsou všechny soubory PDF, sloučí se do jednoho PDF dokumentu. Pokud je mix textu a PDF, textový obsah se také převede na PDF stránky (font Courier, formát A4, automatické zalamování řádků a paginace).

## GitHub integrace

Propojte svůj projekt s GitHub repozitářem pro automatický import a synchronizaci souborů. Umožňuje rychle stáhnout zdrojový kód bez klonování repozitáře.

### Připojení repozitáře

- Klikněte na tlačítko **GitHub** v toolbaru pro otevření dialogu nastavení
- Zadejte repozitář ve formátu `owner/repo` nebo vložte celou GitHub URL (přípona `.git` se automaticky odstraní)
- Pro soukromé repozitáře zadejte osobní přístupový token do pole **Přístupový token**
- Vyberte **větev** — kliknutím na **Načíst větve** načtete seznam dostupných větví z API, které se zobrazí jako klikatelné chipy
- Volitelně klikněte na **Načíst složky** pro načtení stromové struktury repozitáře a nastavení vynechání
- Klikněte na **Připojit a synchronizovat** pro uložení konfigurace a okamžitou synchronizaci souborů

### Vynechání souborů

- StitchDeck automaticky parsuje a respektuje všechny `.gitignore` soubory v repozitáři, podporuje patterny `**`, `*`, `?`, `/` anchoring, directory-only patterny (trailing `/`), negaci (`!`), character classes (`[abc]`) a escaped znaky
- Ve stromové struktuře můžete zaškrtnout další složky a soubory k vynechání — zaškrtnuté položky se zobrazí s přeškrtnutým textem
- Kliknutí na šipku rozbalí/sbalí adresář bez zaškrtnutí checkboxu; checkboxy rodič/potomek se kaskádují a zobrazují indeterminate stav při částečném zaškrtnutí
- Binární soubory (obrázky, fonty, archivy, spustitelné soubory atd.) se automaticky přeskakují bez ohledu na nastavení

### Synchronizace

- Po připojení se pod toolbarem zobrazí stavový řádek s logem GitHubu, názvem repozitáře a aktuální větví
- Stavový řádek má tři tlačítka: **Sync** (aktualizace souborů), **Nastavení** (otevře dialog s předvyplněnými hodnotami) a **Odpojit**
- Při synchronizaci se nahradí pouze soubory označené `source: 'github'` novými verzemi z GitHubu
- Manuálně vložené soubory (`source: 'manual'`) a vlastní texty zůstávají na svých pozicích a v pořadí
- Pokud by pozice manuálních souborů po synchronizaci přesahovaly celkový počet, automaticky se přepočítají
- Soubory se stahují přes `raw.githubusercontent.com` v dávkách po 10 pro optimální výkon
- Dialog průběhu zobrazuje aktuální stav (načítání stromu, zpracování .gitignore, stahování souborů s čítačem průběhu)
- Konfigurace GitHubu se ukládá jako součást projektu v IndexedDB

### Odpojení

Klikněte na tlačítko odpojení (ikona křížku) ve stavovém řádku. Zobrazí se potvrzovací dialog. Soubory synchronizované z GitHubu zůstanou v projektu — odstraní se pouze propojení.

## Tipy a klávesy

Tipy a klávesové zkratky pro efektivnější práci se StitchDeck.

### Klávesové zkratky

- `Esc` — zavře modální dialog
- `Enter` — potvrdí akci v modálním dialogu (např. vytvoření projektu, přejmenování)

### Tipy pro efektivní práci

- Použijte **LLM-optimalizovaný formát** pro nejlepší výsledky s AI modely — mapa souborů na začátku dá modelu přehled o všech souborech ještě před čtením obsahu
- Zapněte **kompresi exportu** pokud potřebujete snížit počet tokenů — to je obzvláště užitečné u velkých kódových bází, kde se komentáře a whitespace nastřádají
- Vložte **vlastní text** na pozici 1 s instrukcemi pro AI (např. „Analyzuj tento kód a najdi potenciální chyby" nebo „Refaktoruj následující kód pro lepší čitelnost")
- **Bezpečnostní sken** nechte zapnutý — chrání před nechtěným sdílením API klíčů, databázových hesel a dalších tajných údajů s AI službami
- Propojte projekt s **GitHub** pro rychlý import souborů z repozitáře — přímo ve stromové struktuře můžete vynechat složky jako `node_modules`, `dist` nebo `.env`
- Použijte **stromový režim** zobrazení při práci s mnoha soubory z hluboké adresářové struktury — usnadní pochopení layoutu projektu
- **Režim dlaždic** je skvělý pro rychlý vizuální přehled typů souborů díky barevným badge přípon

### Ukládání dat

StitchDeck ukládá všechna data lokálně ve vašem prohlížeči:

- **IndexedDB** — data projektů včetně souborů, vlastních textů a GitHub konfigurace
- **localStorage** — uživatelské preference (režim zobrazení, jazyk, téma, volby sloučení)

Žádná data se nikdy neodesílají na žádný externí server. Vymazání dat prohlížeče odstraní všechny projekty a nastavení.

### Podpora prohlížečů

StitchDeck funguje ve všech moderních prohlížečích — Chrome, Firefox, Safari a Edge. Vyžaduje zapnutý JavaScript a využívá moderní API prohlížeče (IndexedDB, Clipboard API, Drag & Drop API, Web Crypto API, CompressionStream).